import { getPublicCampaignPath } from '@/utils/campaign-url'
import { getAssessmentReadiness } from '@/utils/services/assessment-runtime'
import type { AdminClient } from '@/utils/services/admin-campaigns/types'

type CampaignRelation = {
  id: string
  organisation_id: string | null
  name: string
  external_name: string
  slug: string
  status: string
  created_at: string
  updated_at?: string | null
  organisations:
    | { id: string; name: string; slug: string }
    | Array<{ id: string; name: string; slug: string }>
    | null
}

type CampaignAssessmentRelationRow = {
  id: string
  campaign_id: string
  assessment_id: string
  sort_order: number
  is_active: boolean
  created_at: string
  campaigns: CampaignRelation | CampaignRelation[] | null
}

type CampaignFlowStepRow = {
  id: string
  campaign_id: string
  step_type: 'assessment' | 'screen'
  sort_order: number
  is_active: boolean
  campaign_assessment_id: string | null
}

type SubmissionCountRow = {
  campaign_id: string | null
}

export type AdminAssessmentCampaignRow = {
  id: string
  campaignAssessmentId: string
  name: string
  external_name: string
  slug: string
  status: string
  organisation_id: string | null
  owner_scope: 'lq' | 'client'
  owner_label: string
  organisations: { id: string; name: string; slug: string } | null
  is_active: boolean
  flow_position_label: string
  flow_detail: string
  response_count: number
  can_shadow_preview: boolean
  shadow_preview_url: string
}

function pickRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function isMissingFlowStepsTable(
  error: { message?: string; details?: string | null; hint?: string | null } | null | undefined
) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ').toLowerCase()
  return text.includes('campaign_flow_steps') && (text.includes('relation') || text.includes('table') || text.includes('schema'))
}

function buildFallbackFlowSummary(input: {
  sortOrder: number
  totalAssessments: number
}) {
  return {
    flow_position_label: `Assessment ${input.sortOrder + 1} of ${input.totalAssessments}`,
    flow_detail: 'Legacy campaign ordering',
  }
}

function buildFlowSummary(input: {
  campaignAssessmentId: string
  sortOrder: number
  totalAssessments: number
  flowSteps: CampaignFlowStepRow[]
}) {
  if (input.flowSteps.length === 0) {
    return buildFallbackFlowSummary({
      sortOrder: input.sortOrder,
      totalAssessments: input.totalAssessments,
    })
  }

  const orderedSteps = [...input.flowSteps].sort((left, right) => left.sort_order - right.sort_order)
  const stepIndex = orderedSteps.findIndex((step) => step.campaign_assessment_id === input.campaignAssessmentId)
  const assessmentSteps = orderedSteps.filter((step) => step.step_type === 'assessment')
  const assessmentIndex = assessmentSteps.findIndex((step) => step.campaign_assessment_id === input.campaignAssessmentId)

  if (stepIndex < 0 || assessmentIndex < 0) {
    return buildFallbackFlowSummary({
      sortOrder: input.sortOrder,
      totalAssessments: input.totalAssessments,
    })
  }

  if (orderedSteps.length === assessmentSteps.length) {
    return {
      flow_position_label: `Assessment ${assessmentIndex + 1} of ${assessmentSteps.length}`,
      flow_detail: 'No interstitial screens in the current flow',
    }
  }

  return {
    flow_position_label: `Step ${stepIndex + 1} of ${orderedSteps.length}`,
    flow_detail: `Assessment ${assessmentIndex + 1} of ${assessmentSteps.length}`,
  }
}

export async function listAdminAssessmentCampaigns(input: {
  adminClient: AdminClient
  assessmentId: string
}): Promise<
  | {
      ok: true
      data: {
        campaigns: AdminAssessmentCampaignRow[]
      }
    }
  | {
      ok: false
      error: 'campaigns_list_failed'
    }
> {
  const campaignAssessmentResult = await input.adminClient
    .from('campaign_assessments')
    .select(
      `
      id, campaign_id, assessment_id, sort_order, is_active, created_at,
      campaigns!inner(id, organisation_id, name, external_name, slug, status, created_at, updated_at, organisations(id, name, slug))
    `
    )
    .eq('assessment_id', input.assessmentId)
    .order('sort_order', { ascending: true })

  if (campaignAssessmentResult.error) {
    return { ok: false, error: 'campaigns_list_failed' }
  }

  const campaignAssessmentRows = (campaignAssessmentResult.data ?? []) as CampaignAssessmentRelationRow[]
  if (campaignAssessmentRows.length === 0) {
    return {
      ok: true,
      data: {
        campaigns: [],
      },
    }
  }

  const campaignIds = [...new Set(campaignAssessmentRows.map((row) => row.campaign_id))]
  const [flowResult, submissionResult, readiness] = await Promise.all([
    input.adminClient
      .from('campaign_flow_steps')
      .select('id, campaign_id, step_type, sort_order, is_active, campaign_assessment_id')
      .in('campaign_id', campaignIds)
      .order('sort_order', { ascending: true }),
    input.adminClient
      .from('assessment_submissions')
      .select('campaign_id')
      .eq('assessment_id', input.assessmentId)
      .eq('is_preview_sample', false)
      .in('campaign_id', campaignIds),
    getAssessmentReadiness({
      adminClient: input.adminClient,
      assessmentId: input.assessmentId,
    }),
  ])

  if (submissionResult.error) {
    return { ok: false, error: 'campaigns_list_failed' }
  }

  const flowStepsByCampaign = new Map<string, CampaignFlowStepRow[]>()
  if (!flowResult.error) {
    for (const row of (flowResult.data ?? []) as CampaignFlowStepRow[]) {
      const existing = flowStepsByCampaign.get(row.campaign_id) ?? []
      existing.push(row)
      flowStepsByCampaign.set(row.campaign_id, existing)
    }
  } else if (!isMissingFlowStepsTable(flowResult.error)) {
    return { ok: false, error: 'campaigns_list_failed' }
  }

  const submissionCountByCampaign = new Map<string, number>()
  for (const row of (submissionResult.data ?? []) as SubmissionCountRow[]) {
    if (!row.campaign_id) continue
    submissionCountByCampaign.set(row.campaign_id, (submissionCountByCampaign.get(row.campaign_id) ?? 0) + 1)
  }

  const totalAssessmentsByCampaign = new Map<string, number>()
  for (const row of campaignAssessmentRows) {
    totalAssessmentsByCampaign.set(row.campaign_id, (totalAssessmentsByCampaign.get(row.campaign_id) ?? 0) + 1)
  }

  const canShadowPreview = readiness?.canPreview ?? false

  return {
    ok: true,
    data: {
      campaigns: campaignAssessmentRows.map((row) => {
        const campaign = pickRelation(row.campaigns)
        const organisation = pickRelation(campaign?.organisations)
        const flowSummary = buildFlowSummary({
          campaignAssessmentId: row.id,
          sortOrder: row.sort_order,
          totalAssessments: totalAssessmentsByCampaign.get(row.campaign_id) ?? 1,
          flowSteps: flowStepsByCampaign.get(row.campaign_id) ?? [],
        })

        return {
          id: row.campaign_id,
          campaignAssessmentId: row.id,
          name: campaign?.name ?? 'Campaign',
          external_name: campaign?.external_name ?? campaign?.name ?? 'Campaign',
          slug: campaign?.slug ?? '',
          status: campaign?.status ?? 'draft',
          organisation_id: campaign?.organisation_id ?? null,
          owner_scope: campaign?.organisation_id ? 'client' : 'lq',
          owner_label: organisation?.name ?? 'Leadership Quarter',
          organisations: organisation,
          is_active: row.is_active,
          flow_position_label: flowSummary.flow_position_label,
          flow_detail: flowSummary.flow_detail,
          response_count: submissionCountByCampaign.get(row.campaign_id) ?? 0,
          can_shadow_preview: canShadowPreview,
          shadow_preview_url: getPublicCampaignPath(campaign?.slug ?? '', organisation?.slug),
        } satisfies AdminAssessmentCampaignRow
      }),
    },
  }
}
