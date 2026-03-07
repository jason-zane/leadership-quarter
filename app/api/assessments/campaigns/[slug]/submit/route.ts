import { NextResponse } from 'next/server'
import {
  createGateAccessToken,
  createReportAccessToken,
  hasGateAccessTokenSecret,
  hasReportAccessTokenSecret,
} from '@/utils/security/report-access'
import { submitAssessment } from '@/utils/assessments/submission-pipeline'
import type { CampaignConfig } from '@/utils/assessments/campaign-types'
import { createAdminClient } from '@/utils/supabase/admin'
import { InvitationSubmitSchema } from '@/utils/assessments/submission-schema'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { logRequest } from '@/utils/logger'

export const maxDuration = 30

type AssessmentRow = {
  id: string
  assessment_id: string
  sort_order: number
  is_active: boolean
  assessments: unknown
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const t0 = Date.now()
  const traceId = request.headers.get('x-vercel-id') ?? request.headers.get('x-request-id') ?? undefined

  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ ok: false, error: 'missing_service_role' }, { status: 500 })
  }

  const { slug } = await params

  // Rate limit by IP: 20 submissions per minute per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const { allowed } = await checkRateLimit(`campaign-submit:${ip}`, 20, 60)
  if (!allowed) {
    logRequest({ route: `/api/assessments/campaigns/${slug}/submit`, status: 429, durationMs: Date.now() - t0, traceId })
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }

  const rawBody = await request.json().catch(() => null)
  const parsed = InvitationSubmitSchema.safeParse(rawBody)
  if (!parsed.success) {
    logRequest({ route: `/api/assessments/campaigns/${slug}/submit`, status: 400, durationMs: Date.now() - t0, traceId })
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
  }

  const { responses } = parsed.data

  const { data: campaignRow, error: campaignError } = await adminClient
    .from('campaigns')
    .select(`
      id, name, status, config,
      campaign_assessments(id, assessment_id, sort_order, is_active, assessments(id, key, name, status))
    `)
    .eq('slug', slug)
    .maybeSingle()

  if (campaignError || !campaignRow) {
    logRequest({ route: `/api/assessments/campaigns/${slug}/submit`, status: 404, durationMs: Date.now() - t0, traceId })
    return NextResponse.json({ ok: false, error: 'campaign_not_found' }, { status: 404 })
  }

  if (campaignRow.status !== 'active') {
    logRequest({ route: `/api/assessments/campaigns/${slug}/submit`, status: 410, durationMs: Date.now() - t0, traceId })
    return NextResponse.json({ ok: false, error: 'campaign_not_active' }, { status: 410 })
  }

  const rawAssessments = (campaignRow.campaign_assessments ?? []) as AssessmentRow[]
  const firstAssessment = rawAssessments
    .filter((assessment) => assessment.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)[0]
  const assessmentRel = firstAssessment?.assessments as unknown
  const assessment = (Array.isArray(assessmentRel) ? assessmentRel[0] : assessmentRel) as
    | { id: string; key: string; name: string; status: string }
    | null

  if (!assessment || assessment.status !== 'active') {
    logRequest({ route: `/api/assessments/campaigns/${slug}/submit`, status: 410, durationMs: Date.now() - t0, traceId })
    return NextResponse.json({ ok: false, error: 'assessment_not_active' }, { status: 410 })
  }

  const config = campaignRow.config as CampaignConfig

  const pipeline = await submitAssessment({
    adminClient,
    assessmentId: assessment.id,
    responses,
    campaignId: campaignRow.id,
    participant: {
      firstName: null,
      lastName: null,
      email: null,
      organisation: null,
      role: null,
      contactId: null,
    },
    consent: true,
  })

  if (!pipeline.ok) {
    const status = pipeline.error === 'invalid_responses' ? 400 : 500
    logRequest({ route: `/api/assessments/campaigns/${slug}/submit`, status, durationMs: Date.now() - t0, traceId, error: pipeline.error })
    return NextResponse.json({ ok: false, error: pipeline.error }, { status })
  }

  logRequest({ route: `/api/assessments/campaigns/${slug}/submit`, status: 200, durationMs: Date.now() - t0, traceId, assessmentId: assessment.id })

  if (config.report_access === 'none') {
    return NextResponse.json({ ok: true, nextStep: 'complete_no_report' as const })
  }

  if (config.report_access === 'gated') {
    if (process.env.NODE_ENV !== 'development' && !hasGateAccessTokenSecret()) {
      return NextResponse.json({ ok: false, error: 'missing_gate_secret' }, { status: 500 })
    }

    const gateToken = createGateAccessToken({
      submissionId: pipeline.data.submissionId,
      campaignId: campaignRow.id,
      assessmentId: assessment.id,
      expiresInSeconds: 24 * 60 * 60,
    })

    if (!gateToken) {
      return NextResponse.json({ ok: false, error: 'missing_gate_secret' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      nextStep: 'contact_gate' as const,
      gatePath: `/assess/contact?gate=${encodeURIComponent(gateToken)}`,
    })
  }

  if (process.env.NODE_ENV !== 'development' && !hasReportAccessTokenSecret()) {
    return NextResponse.json({ ok: false, error: 'missing_report_secret' }, { status: 500 })
  }

  const reportAccessToken = createReportAccessToken({
    report: 'assessment',
    submissionId: pipeline.data.submissionId,
    expiresInSeconds: 7 * 24 * 60 * 60,
  })

  if (!reportAccessToken) {
    return NextResponse.json({ ok: false, error: 'missing_report_secret' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    submissionId: pipeline.data.submissionId,
    reportPath: '/assess/r/assessment',
    reportAccessToken,
  })
}
