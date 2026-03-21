import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  AdminResponseDetail,
  type AdminResponseDetailData,
} from '@/components/dashboard/responses/admin-response-detail'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { getAssessmentV2Runtime } from '@/utils/services/assessment-runtime-service'
import { getAdminCampaignSubmission } from '@/utils/services/admin-campaigns'
import {
  buildClassicItemResponses,
  buildDemographicEntries,
  buildV2ItemResponses,
  humanizeResponseKey,
  isV2AssessmentReportConfig,
  listV2SubmissionReportOptions,
  normalizeClassicResponseReportOptions,
} from '@/utils/services/response-experience'
import { getSubmissionReportOptions } from '@/utils/services/submission-report-options'
import { getV2SubmissionReport } from '@/utils/services/assessment-submission-report'
import { getAssessmentReportData } from '@/utils/reports/assessment-report'
import { createAdminClient } from '@/utils/supabase/admin'

type Props = {
  params: Promise<{ id: string; submissionId: string }>
  searchParams: Promise<{ tab?: string }>
}

type AssessmentRelation = {
  id?: string
  key?: string
  name?: string
  report_config?: unknown
}

type CampaignSubmissionRecord = {
  assessment_id: string
  assessments: AssessmentRelation | AssessmentRelation[] | null
  demographics: Record<string, unknown> | null
  responses: Record<string, number> | null
  normalized_responses: Record<string, number> | null
}

type CampaignSubmissionSummary = {
  participantName: string
  email: string
  organisation: string | null
  role: string | null
  status: string
  submittedAt: string
}

function pickRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function toInitialTab(value: string | undefined) {
  if (value === 'traits' || value === 'responses' || value === 'outcomes' || value === 'reports') {
    return value
  }
  return 'overview'
}

function formatSubmittedLabel(value: string) {
  return `Submitted ${new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))}`
}

function formatStatusLabel(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

async function buildClassicDetailData(input: {
  adminClient: NonNullable<ReturnType<typeof createAdminClient>>
  submissionId: string
  assessmentId: string
  submission: CampaignSubmissionRecord
  summary: CampaignSubmissionSummary
}): Promise<AdminResponseDetailData | null> {
  const [reportData, reportOptions, itemResponses] = await Promise.all([
    getAssessmentReportData(input.adminClient, input.submissionId),
    getSubmissionReportOptions({
      adminClient: input.adminClient,
      submissionId: input.submissionId,
      expiresInSeconds: 7 * 24 * 60 * 60,
    }),
    buildClassicItemResponses({
      adminClient: input.adminClient,
      assessmentId: input.assessmentId,
      rawResponses: input.submission.responses,
      normalizedResponses: input.submission.normalized_responses,
    }),
  ])

  if (!reportData) {
    return null
  }

  return {
    participantName: input.summary.participantName,
    email: input.summary.email || reportData.participant.email,
    contextLine: [input.summary.organisation, input.summary.role].filter(Boolean).join(' · ') || 'No organisation or role stored',
    submittedLabel: formatSubmittedLabel(input.summary.submittedAt),
    statusLabel: formatStatusLabel(input.summary.status),
    demographics: buildDemographicEntries(input.submission.demographics),
    traitScores: reportData.traitScores.map((item) => ({
      key: item.traitCode,
      label: item.traitExternalName || item.traitName,
      groupLabel: item.dimensionExternalName || item.dimensionName || null,
      value: item.rawScore,
      band: item.band,
      meaning: item.description,
    })),
    itemResponses,
    classificationLabel: reportData.classification.label,
    classificationDescription: reportData.classification.description,
    recommendations: reportData.recommendations,
    interpretations: reportData.interpretations.map((item, index) => ({
      key: `${item.targetType}-${item.ruleType}-${index}`,
      label: item.title?.trim() || humanizeResponseKey(`${item.targetType} ${item.ruleType}`),
      description: item.body,
    })),
    outcomeGroups: [
      {
        title: 'Dimension profiles',
        emptyMessage: 'No dimension-level outcomes are available for this response.',
        items: reportData.dimensionProfiles.map((item) => ({
          key: item.key,
          label: item.label,
          groupLabel: item.internalLabel || null,
          value: item.score,
          band: item.provisional ? 'Provisional' : null,
          meaning: item.description,
        })),
      },
    ],
    reportOptions: normalizeClassicResponseReportOptions(reportOptions),
  }
}

async function buildV2DetailData(input: {
  adminClient: NonNullable<ReturnType<typeof createAdminClient>>
  submissionId: string
  assessmentId: string
  submission: CampaignSubmissionRecord
  summary: CampaignSubmissionSummary
}): Promise<AdminResponseDetailData | null> {
  const [runtimeResult, reportResult, reportOptions] = await Promise.all([
    getAssessmentV2Runtime({
      adminClient: input.adminClient,
      assessmentId: input.assessmentId,
    }),
    getV2SubmissionReport({
      adminClient: input.adminClient,
      submissionId: input.submissionId,
    }),
    listV2SubmissionReportOptions({
      adminClient: input.adminClient,
      assessmentId: input.assessmentId,
      submissionId: input.submissionId,
      expiresInSeconds: 7 * 24 * 60 * 60,
    }),
  ])

  if (!runtimeResult.ok || !reportResult.ok) {
    return null
  }

  const reportContext = reportResult.data.context.v2Report

  return {
    participantName:
      input.summary.participantName || reportContext.personName || 'Participant',
    email: input.summary.email || null,
    contextLine:
      [input.summary.organisation || reportContext.organisation, input.summary.role || reportContext.role]
        .filter(Boolean)
        .join(' · ') || 'No organisation or role stored',
    submittedLabel: formatSubmittedLabel(input.summary.submittedAt),
    statusLabel: formatStatusLabel(input.summary.status),
    demographics: buildDemographicEntries(input.submission.demographics),
    traitScores: reportContext.trait_scores.map((item) => ({
      key: item.key,
      label: item.label,
      groupLabel: null,
      value: item.value,
      band: item.band || null,
      meaning: null,
    })),
    itemResponses: buildV2ItemResponses({
      questionBank: runtimeResult.data.definition.questionBank,
      rawResponses: input.submission.responses,
      normalizedResponses: input.submission.normalized_responses,
    }),
    classificationLabel: reportContext.classification?.label ?? null,
    classificationDescription: reportContext.classification?.description ?? null,
    recommendations: reportContext.recommendations.map((item) => item.description || item.label),
    interpretations: reportContext.interpretations,
    outcomeGroups: [
      {
        title: 'Dimension scores',
        emptyMessage: 'No dimension-level scores are available for this response.',
        items: reportContext.dimension_scores.map((item) => ({
          key: item.key,
          label: item.label,
          groupLabel: null,
          value: item.value,
          band: item.band || null,
          meaning: null,
        })),
      },
      {
        title: 'Competency scores',
        emptyMessage: 'No competency-level scores are available for this response.',
        items: reportContext.competency_scores.map((item) => ({
          key: item.key,
          label: item.label,
          groupLabel: null,
          value: item.value,
          band: item.band || null,
          meaning: null,
        })),
      },
    ],
    reportOptions,
  }
}

export default async function CampaignSubmissionDetailPage({ params, searchParams }: Props) {
  const { id: campaignId, submissionId } = await params
  const query = await searchParams
  const adminClient = createAdminClient()

  if (!adminClient) {
    return <p className="text-sm text-red-600">Supabase service role is not configured.</p>
  }

  const result = await getAdminCampaignSubmission({
    adminClient,
    campaignId,
    submissionId,
  })

  if (!result.ok) {
    notFound()
  }

  const assessment = pickRelation(result.data.submission.assessments as AssessmentRelation | AssessmentRelation[] | null)
  const assessmentId = assessment?.id ?? result.data.submission.assessment_id
  const isV2 = isV2AssessmentReportConfig(assessment?.report_config)

  const detailData = isV2
    ? await buildV2DetailData({
        adminClient,
        submissionId,
        assessmentId,
        submission: result.data.submission,
        summary: result.data.summary,
      })
    : await buildClassicDetailData({
        adminClient,
        submissionId,
        assessmentId,
        submission: result.data.submission,
        summary: result.data.summary,
      })

  if (!detailData) {
    notFound()
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Campaign responses"
        title={detailData.participantName}
        description="Submission detail for this campaign response, including respondent context, trait-level scoring, raw item metadata, outcomes, and report options."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/dashboard/campaigns/${campaignId}/responses`}
              className="foundation-btn foundation-btn-secondary foundation-btn-md"
            >
              Back to responses
            </Link>
            <Link
              href={`/dashboard/campaigns/${campaignId}/responses/candidates/${encodeURIComponent(result.data.candidateKey)}`}
              className="foundation-btn foundation-btn-secondary foundation-btn-md"
            >
              Open candidate journey
            </Link>
          </div>
        )}
      />

      <AdminResponseDetail data={detailData} initialTab={toInitialTab(query.tab)} />
    </DashboardPageShell>
  )
}
