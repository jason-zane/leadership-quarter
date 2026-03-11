import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReportSelectionMode } from '@/utils/reports/report-variants'
import { createReportAccessToken } from '@/utils/security/report-access'
import { downloadReportPdf } from '@/utils/services/report-pdf'
import { createAdminClient } from '@/utils/supabase/admin'
import { resolveReportAccessPayload, toReportAccessKind } from '@/utils/reports/assemble-report-document'
import type { ReportDocumentType } from '@/utils/reports/report-document-types'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

export type ReportExportJobRow = {
  id: string
  status: 'pending' | 'processing' | 'ready' | 'failed'
  report_type: ReportDocumentType
  subject_ref: string
  requested_by: string | null
  storage_bucket: string | null
  storage_path: string | null
  template_version: string
  attempts: number
  max_attempts: number
  last_error: string | null
  run_at: string
}

export type CreateReportExportJobResult =
  | { ok: true; data: { jobId: string } }
  | { ok: false; error: 'queue_failed' }

export type GetReportExportStatusResult =
  | { ok: true; data: { status: ReportExportJobRow['status']; signedUrl?: string; lastError?: string | null } }
  | { ok: false; error: 'not_found' | 'forbidden' | 'missing_service_role' | 'status_failed' }

export type ProcessReportExportJobsResult =
  | {
      ok: true
      data: {
        fetched: number
        ready: number
        failed: number
        skipped: number
      }
    }
  | {
      ok: false
      error: 'missing_service_role' | 'job_fetch_failed'
    }

function getGeneratedReportsBucket() {
  return process.env.GENERATED_REPORTS_BUCKET?.trim() || 'generated-reports'
}

function encodeSubjectRef(input: {
  submissionId: string
  selectionMode?: ReportSelectionMode | null
  reportVariantId?: string | null
}) {
  const selectionMode = input.selectionMode ?? ''
  const reportVariantId = input.reportVariantId?.trim() ?? ''
  return [input.submissionId, selectionMode, reportVariantId].join('::')
}

function decodeSubjectRef(subjectRef: string) {
  const [submissionId, selectionModeRaw, reportVariantIdRaw] = subjectRef.split('::')
  const selectionMode: ReportSelectionMode | null =
    selectionModeRaw === 'frozen_default'
    || selectionModeRaw === 'latest_variant'
    || selectionModeRaw === 'latest_campaign_default'
      ? selectionModeRaw
      : null
  const reportVariantId = reportVariantIdRaw?.trim() ? reportVariantIdRaw.trim() : null

  return {
    submissionId: submissionId || subjectRef,
    selectionMode,
    reportVariantId,
  }
}

function getStoragePath(job: Pick<ReportExportJobRow, 'id' | 'report_type' | 'subject_ref'>, filename: string) {
  const subject = decodeSubjectRef(job.subject_ref)
  return `${job.report_type}/${subject.submissionId}/${job.id}-${filename}`
}

async function claimJob(adminClient: AdminClient, job: ReportExportJobRow, nextAttempt: number) {
  const { data } = await adminClient
    .from('report_export_jobs')
    .update({
      status: 'processing',
      attempts: nextAttempt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', job.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  return data ?? null
}

async function markJobReady(
  adminClient: AdminClient,
  jobId: string,
  storageBucket: string,
  storagePath: string
) {
  await adminClient
    .from('report_export_jobs')
    .update({
      status: 'ready',
      storage_bucket: storageBucket,
      storage_path: storagePath,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
}

async function markJobFailed(input: {
  adminClient: AdminClient
  job: ReportExportJobRow
  nextAttempt: number
  errorMessage: string
  nowIso: string
}) {
  const shouldRetry = input.nextAttempt < input.job.max_attempts
  const retryAt = new Date(Date.now() + input.nextAttempt * 60_000).toISOString()

  await input.adminClient
    .from('report_export_jobs')
    .update({
      status: shouldRetry ? 'pending' : 'failed',
      run_at: shouldRetry ? retryAt : input.nowIso,
      last_error: input.errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.job.id)
}

export async function createReportExportJob(
  adminClient: AdminClient,
  input: {
    reportType: ReportDocumentType
    subjectRef: string
    requestedBy?: string | null
    selectionMode?: ReportSelectionMode | null
    reportVariantId?: string | null
  }
): Promise<CreateReportExportJobResult> {
  const { data, error } = await adminClient
    .from('report_export_jobs')
    .insert({
      report_type: input.reportType,
      subject_ref: encodeSubjectRef({
        submissionId: input.subjectRef,
        selectionMode: input.selectionMode,
        reportVariantId: input.reportVariantId,
      }),
      requested_by: input.requestedBy ?? null,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    return { ok: false, error: 'queue_failed' }
  }

  return { ok: true, data: { jobId: data.id } }
}

export async function getReportExportStatus(input: {
  adminClient: AdminClient
  jobId: string
  reportType: ReportDocumentType
  accessToken: string
}): Promise<GetReportExportStatusResult> {
  const payload = resolveReportAccessPayload({
    reportType: input.reportType,
    accessToken: input.accessToken,
  })

  if (!payload) {
    return { ok: false, error: 'forbidden' }
  }

  const { data, error } = await input.adminClient
    .from('report_export_jobs')
    .select('id, status, report_type, subject_ref, requested_by, storage_bucket, storage_path, template_version, attempts, max_attempts, last_error, run_at')
    .eq('id', input.jobId)
    .maybeSingle()

  if (error) {
    return { ok: false, error: 'status_failed' }
  }

  if (!data) {
    return { ok: false, error: 'not_found' }
  }

  const job = data as ReportExportJobRow
  const jobSubject = decodeSubjectRef(job.subject_ref)
  if (
    job.report_type !== input.reportType
    || jobSubject.submissionId !== payload.submissionId
    || (payload.selectionMode ?? null) !== jobSubject.selectionMode
    || (payload.reportVariantId ?? null) !== jobSubject.reportVariantId
  ) {
    return { ok: false, error: 'forbidden' }
  }

  if (job.status !== 'ready' || !job.storage_bucket || !job.storage_path) {
    return {
      ok: true,
      data: {
        status: job.status,
        lastError: job.last_error,
      },
    }
  }

  const signed = await input.adminClient.storage
    .from(job.storage_bucket)
    .createSignedUrl(job.storage_path, 10 * 60)

  if (signed.error || !signed.data?.signedUrl) {
    return { ok: false, error: 'status_failed' }
  }

  return {
    ok: true,
    data: {
      status: job.status,
      signedUrl: signed.data.signedUrl,
      lastError: job.last_error,
    },
  }
}

export async function processPendingReportExportJobs(input: {
  adminClient: AdminClient
  batchSize?: number
}): Promise<ProcessReportExportJobsResult> {
  const { data: rows, error } = await input.adminClient
    .from('report_export_jobs')
    .select('id, status, report_type, subject_ref, requested_by, storage_bucket, storage_path, template_version, attempts, max_attempts, last_error, run_at')
    .eq('status', 'pending')
    .lte('run_at', new Date().toISOString())
    .order('run_at', { ascending: true })
    .limit(input.batchSize ?? 10)

  if (error) {
    return { ok: false, error: 'job_fetch_failed' }
  }

  const jobs = (rows ?? []) as ReportExportJobRow[]
  const storageBucket = getGeneratedReportsBucket()

  let ready = 0
  let failed = 0
  let skipped = 0

  for (const job of jobs) {
    const nextAttempt = job.attempts + 1
    const claimed = await claimJob(input.adminClient, job, nextAttempt)
    if (!claimed) {
      skipped += 1
      continue
    }

    try {
      const subject = decodeSubjectRef(job.subject_ref)
      const accessToken = createReportAccessToken({
        report: toReportAccessKind(job.report_type),
        submissionId: subject.submissionId,
        selectionMode: subject.selectionMode,
        reportVariantId: subject.reportVariantId,
        expiresInSeconds: 7 * 24 * 60 * 60,
      })

      if (!accessToken) {
        throw new Error('missing_report_secret')
      }

      const result = await downloadReportPdf({
        reportType: job.report_type,
        accessToken,
      })

      if (!result.ok) {
        throw new Error(result.error)
      }

      const storagePath = getStoragePath(job, result.data.filename)
      const upload = await input.adminClient.storage
        .from(storageBucket)
        .upload(storagePath, result.data.pdfBuffer, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: true,
        })

      if (upload.error) {
        throw new Error(upload.error.message)
      }

      await markJobReady(input.adminClient, job.id, storageBucket, storagePath)
      ready += 1
    } catch (jobError) {
      await markJobFailed({
        adminClient: input.adminClient,
        job,
        nextAttempt,
        errorMessage: jobError instanceof Error ? jobError.message : 'render_failed',
        nowIso: new Date().toISOString(),
      })
      failed += 1
    }
  }

  return {
    ok: true,
    data: {
      fetched: jobs.length,
      ready,
      failed,
      skipped,
    },
  }
}
