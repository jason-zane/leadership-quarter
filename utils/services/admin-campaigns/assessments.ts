import type {
  AdminClient,
  CampaignAssessmentPayload,
} from '@/utils/services/admin-campaigns/types'
import { listPublishedAssessmentReportVariants } from '@/utils/reports/report-variants'
import { normalizeCampaignAssessmentReportDeliveryConfig } from '@/utils/reports/report-overrides'

export async function addAdminCampaignAssessment(input: {
  adminClient: AdminClient
  campaignId: string
  payload: CampaignAssessmentPayload | null
}): Promise<
  | {
      ok: true
      data: {
        assessment: unknown
      }
    }
  | {
      ok: false
      error: 'survey_id_required' | 'assessment_already_added' | 'add_assessment_failed'
    }
> {
  const assessmentId = String(
    input.payload?.assessment_id ?? input.payload?.survey_id ?? ''
  ).trim()
  if (!assessmentId) {
    return { ok: false, error: 'survey_id_required' }
  }

  let publishedVariants: Awaited<ReturnType<typeof listPublishedAssessmentReportVariants>> = []
  try {
    publishedVariants = await listPublishedAssessmentReportVariants({
      adminClient: input.adminClient,
      assessmentId,
    })
  } catch {
    publishedVariants = []
  }
  const defaultPublishedVariantId = publishedVariants.find((item) => item.variant.is_default)?.variant.id ?? null
  const deliveryConfig = normalizeCampaignAssessmentReportDeliveryConfig(
    input.payload?.report_delivery_config,
    input.payload?.report_overrides
  )

  const { data, error } = await input.adminClient
    .from('campaign_assessments')
    .insert({
      campaign_id: input.campaignId,
      assessment_id: assessmentId,
      sort_order: input.payload?.sort_order ?? 0,
      report_overrides: input.payload?.report_overrides ?? {},
      report_delivery_config: {
        public_default_report_variant_id:
          deliveryConfig.public_default_report_variant_id ?? defaultPublishedVariantId,
        internal_allowed_report_variant_ids:
          deliveryConfig.internal_allowed_report_variant_ids.length > 0
            ? deliveryConfig.internal_allowed_report_variant_ids
            : publishedVariants.map((item) => item.variant.id),
      },
    })
    .select('id, campaign_id, assessment_id, sort_order, is_active, report_overrides, report_delivery_config, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'assessment_already_added' }
    }

    return { ok: false, error: 'add_assessment_failed' }
  }

  return {
    ok: true,
    data: {
      assessment: data,
    },
  }
}

export async function updateAdminCampaignAssessment(input: {
  adminClient: AdminClient
  campaignId: string
  campaignAssessmentId: string
  payload: CampaignAssessmentPayload | null
}): Promise<
  | {
      ok: true
      data: {
        assessment: unknown
      }
    }
  | {
      ok: false
      error: 'invalid_payload' | 'update_assessment_failed'
    }
> {
  if (
    !input.payload
    || (input.payload.report_overrides === undefined && input.payload.report_delivery_config === undefined)
  ) {
    return { ok: false, error: 'invalid_payload' }
  }

  const updates: Record<string, unknown> = {}
  if (input.payload.report_overrides !== undefined) {
    updates.report_overrides = input.payload.report_overrides
  }
  if (input.payload.report_delivery_config !== undefined) {
    updates.report_delivery_config = normalizeCampaignAssessmentReportDeliveryConfig(
      input.payload.report_delivery_config,
      input.payload.report_overrides
    )
  }

  const { data, error } = await input.adminClient
    .from('campaign_assessments')
    .update(updates)
    .eq('id', input.campaignAssessmentId)
    .eq('campaign_id', input.campaignId)
    .select('id, campaign_id, assessment_id, sort_order, is_active, report_overrides, report_delivery_config, created_at')
    .maybeSingle()

  if (error || !data) {
    return { ok: false, error: 'update_assessment_failed' }
  }

  return {
    ok: true,
    data: {
      assessment: data,
    },
  }
}

export async function removeAdminCampaignAssessment(input: {
  adminClient: AdminClient
  campaignId: string
  campaignAssessmentId: string
}): Promise<
  | { ok: true }
  | {
      ok: false
      error: 'remove_assessment_failed'
    }
> {
  const { error } = await input.adminClient
    .from('campaign_assessments')
    .delete()
    .eq('id', input.campaignAssessmentId)
    .eq('campaign_id', input.campaignId)

  if (error) {
    return { ok: false, error: 'remove_assessment_failed' }
  }

  return { ok: true }
}
