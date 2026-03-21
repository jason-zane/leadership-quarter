import {
  DEFAULT_CAMPAIGN_SCREEN_STEP_CONFIG,
  normalizeCampaignFlowStep,
  normalizeCampaignScreenStepConfig,
} from '@/utils/assessments/campaign-types'
import type {
  AdminClient,
  CampaignAssessmentPayload,
  CampaignFlowStepPayload,
} from '@/utils/services/admin-campaigns/types'
import {
  addAdminCampaignAssessment,
  updateAdminCampaignAssessment,
} from '@/utils/services/admin-campaigns/assessments'

function isMissingFlowStepsTable(error: { message?: string; details?: string | null; hint?: string | null } | null | undefined) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ').toLowerCase()
  return text.includes('campaign_flow_steps') && (text.includes('relation') || text.includes('table') || text.includes('schema'))
}

async function normalizeSortOrders(adminClient: AdminClient, campaignId: string) {
  const { data, error } = await adminClient
    .from('campaign_flow_steps')
    .select('id')
    .eq('campaign_id', campaignId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error || !data) {
    return
  }

  await Promise.all(
    data.map((row, index) =>
      adminClient
        .from('campaign_flow_steps')
        .update({ sort_order: index, updated_at: new Date().toISOString() })
        .eq('id', row.id)
    )
  )
}

async function syncCampaignAssessmentSortOrders(adminClient: AdminClient, campaignId: string) {
  const flowRows = await listFlowStepRows(adminClient, campaignId)
  if (!flowRows.ok || flowRows.usesFallback) {
    return
  }

  const assessmentStepIds = flowRows.rows
    .filter((row) => row.step_type === 'assessment' && row.campaign_assessment_id)
    .map((row) => row.campaign_assessment_id!)

  await Promise.all(
    assessmentStepIds.map((campaignAssessmentId, index) =>
      adminClient
        .from('campaign_assessments')
        .update({ sort_order: index })
        .eq('campaign_id', campaignId)
        .eq('id', campaignAssessmentId)
    )
  )
}

async function listFlowStepRows(adminClient: AdminClient, campaignId: string) {
  const result = await adminClient
    .from('campaign_flow_steps')
    .select('id, campaign_id, step_type, sort_order, is_active, campaign_assessment_id, screen_config, created_at, updated_at')
    .eq('campaign_id', campaignId)
    .order('sort_order', { ascending: true })

  if (!result.error) {
    return {
      ok: true as const,
      rows: (result.data ?? []).map((row) => normalizeCampaignFlowStep(row)),
      usesFallback: false,
    }
  }

  if (!isMissingFlowStepsTable(result.error)) {
    return {
      ok: false as const,
    }
  }

  const fallback = await adminClient
    .from('campaign_assessments')
    .select('id, campaign_id, sort_order, is_active, created_at')
    .eq('campaign_id', campaignId)
    .order('sort_order', { ascending: true })

  if (fallback.error) {
    return {
      ok: false as const,
    }
  }

  return {
    ok: true as const,
    rows: (fallback.data ?? []).map((row) =>
      normalizeCampaignFlowStep({
        id: row.id,
        campaign_id: row.campaign_id,
        step_type: 'assessment',
        sort_order: row.sort_order,
        is_active: row.is_active,
        campaign_assessment_id: row.id,
        screen_config: DEFAULT_CAMPAIGN_SCREEN_STEP_CONFIG,
        created_at: row.created_at,
        updated_at: row.created_at,
      })
    ),
    usesFallback: true,
  }
}

export async function listAdminCampaignFlowSteps(input: {
  adminClient: AdminClient
  campaignId: string
}) {
  const flowRows = await listFlowStepRows(input.adminClient, input.campaignId)
  if (!flowRows.ok) {
    return { ok: false as const, error: 'flow_steps_list_failed' as const }
  }

  return {
    ok: true as const,
    data: {
      flowSteps: flowRows.rows,
      flowStepsBackedByTable: !flowRows.usesFallback,
    },
  }
}

export async function addAdminCampaignFlowStep(input: {
  adminClient: AdminClient
  campaignId: string
  payload: CampaignFlowStepPayload | null
}) {
  const stepType = input.payload?.step_type === 'screen' ? 'screen' : 'assessment'

  if (stepType === 'assessment') {
    const assessmentResult = await addAdminCampaignAssessment({
      adminClient: input.adminClient,
      campaignId: input.campaignId,
      payload: {
        assessment_id: input.payload?.assessment_id ?? input.payload?.survey_id,
        sort_order: input.payload?.sort_order,
        is_active: input.payload?.is_active,
        report_overrides: input.payload?.report_overrides,
        report_delivery_config: input.payload?.report_delivery_config,
      } satisfies CampaignAssessmentPayload,
    })

    if (!assessmentResult.ok) {
      return assessmentResult
    }

    const flowRows = await listFlowStepRows(input.adminClient, input.campaignId)
    if (!flowRows.ok || flowRows.usesFallback) {
      return {
        ok: true as const,
        data: {
          step: normalizeCampaignFlowStep({
            ...(assessmentResult.data.assessment as Record<string, unknown>),
            campaign_id: input.campaignId,
            step_type: 'assessment',
            campaign_assessment_id: (assessmentResult.data.assessment as { id: string }).id,
            screen_config: DEFAULT_CAMPAIGN_SCREEN_STEP_CONFIG,
            updated_at: new Date().toISOString(),
          }),
        },
      }
    }

    const nextSortOrder = flowRows.rows.length
    const insert = await input.adminClient
      .from('campaign_flow_steps')
      .insert({
        campaign_id: input.campaignId,
        step_type: 'assessment',
        sort_order: nextSortOrder,
        is_active: input.payload?.is_active ?? true,
        campaign_assessment_id: (assessmentResult.data.assessment as { id: string }).id,
        screen_config: DEFAULT_CAMPAIGN_SCREEN_STEP_CONFIG,
      })
      .select('id, campaign_id, step_type, sort_order, is_active, campaign_assessment_id, screen_config, created_at, updated_at')
      .single()

    if (insert.error || !insert.data) {
      return { ok: false as const, error: 'add_flow_step_failed' as const }
    }

    return {
      ok: true as const,
      data: {
        step: normalizeCampaignFlowStep(insert.data),
      },
    }
  }

  const flowRows = await listFlowStepRows(input.adminClient, input.campaignId)
  if (!flowRows.ok || flowRows.usesFallback) {
    return { ok: false as const, error: 'flow_steps_not_ready' as const }
  }

  const insert = await input.adminClient
    .from('campaign_flow_steps')
    .insert({
      campaign_id: input.campaignId,
      step_type: 'screen',
      sort_order: flowRows.rows.length,
      is_active: input.payload?.is_active ?? true,
      screen_config: normalizeCampaignScreenStepConfig(input.payload?.screen_config),
    })
    .select('id, campaign_id, step_type, sort_order, is_active, campaign_assessment_id, screen_config, created_at, updated_at')
    .single()

  if (insert.error || !insert.data) {
    return { ok: false as const, error: 'add_flow_step_failed' as const }
  }

  return {
    ok: true as const,
    data: {
      step: normalizeCampaignFlowStep(insert.data),
    },
  }
}

export async function updateAdminCampaignFlowStep(input: {
  adminClient: AdminClient
  campaignId: string
  stepId: string
  payload: CampaignFlowStepPayload | null
}) {
  const { data: existing, error: existingError } = await input.adminClient
    .from('campaign_flow_steps')
    .select('id, campaign_id, step_type, sort_order, is_active, campaign_assessment_id, screen_config, created_at, updated_at')
    .eq('campaign_id', input.campaignId)
    .eq('id', input.stepId)
    .maybeSingle()

  if (existingError && !isMissingFlowStepsTable(existingError)) {
    return { ok: false as const, error: 'update_flow_step_failed' as const }
  }

  if (existing?.step_type === 'assessment' && existing.campaign_assessment_id) {
    const assessmentResult = await updateAdminCampaignAssessment({
      adminClient: input.adminClient,
      campaignId: input.campaignId,
      campaignAssessmentId: existing.campaign_assessment_id,
      payload: {
        is_active: input.payload?.is_active,
        report_overrides: input.payload?.report_overrides,
        report_delivery_config: input.payload?.report_delivery_config,
      },
    })

    if (!assessmentResult.ok) {
      return assessmentResult
    }
  }

  if (!existing) {
    return { ok: false as const, error: 'flow_step_not_found' as const }
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (input.payload?.is_active !== undefined) {
    updates.is_active = input.payload.is_active
  }
  if (existing.step_type === 'screen' && input.payload?.screen_config) {
    updates.screen_config = normalizeCampaignScreenStepConfig({
      ...existing.screen_config as Record<string, unknown>,
      ...input.payload.screen_config,
    })
  }

  const updated = await input.adminClient
    .from('campaign_flow_steps')
    .update(updates)
    .eq('campaign_id', input.campaignId)
    .eq('id', input.stepId)
    .select('id, campaign_id, step_type, sort_order, is_active, campaign_assessment_id, screen_config, created_at, updated_at')
    .maybeSingle()

  if (updated.error || !updated.data) {
    return { ok: false as const, error: 'update_flow_step_failed' as const }
  }

  return {
    ok: true as const,
    data: {
      step: normalizeCampaignFlowStep(updated.data),
    },
  }
}

export async function deleteAdminCampaignFlowStep(input: {
  adminClient: AdminClient
  campaignId: string
  stepId: string
}) {
  const { data: existing, error: existingError } = await input.adminClient
    .from('campaign_flow_steps')
    .select('id, step_type, campaign_assessment_id')
    .eq('campaign_id', input.campaignId)
    .eq('id', input.stepId)
    .maybeSingle()

  if (existingError && !isMissingFlowStepsTable(existingError)) {
    return { ok: false as const, error: 'delete_flow_step_failed' as const }
  }

  if (!existing) {
    return { ok: false as const, error: 'flow_step_not_found' as const }
  }

  const { error } = await input.adminClient
    .from('campaign_flow_steps')
    .delete()
    .eq('campaign_id', input.campaignId)
    .eq('id', input.stepId)

  if (error) {
    return { ok: false as const, error: 'delete_flow_step_failed' as const }
  }

  if (existing.step_type === 'assessment' && existing.campaign_assessment_id) {
    const deleteAssessment = await input.adminClient
      .from('campaign_assessments')
      .delete()
      .eq('campaign_id', input.campaignId)
      .eq('id', existing.campaign_assessment_id)

    if (deleteAssessment.error) {
      return { ok: false as const, error: 'delete_flow_step_failed' as const }
    }
  }

  await normalizeSortOrders(input.adminClient, input.campaignId)
  await syncCampaignAssessmentSortOrders(input.adminClient, input.campaignId)

  return { ok: true as const }
}

export async function moveAdminCampaignFlowStep(input: {
  adminClient: AdminClient
  campaignId: string
  stepId: string
  direction: 'up' | 'down'
}) {
  const flowRows = await listFlowStepRows(input.adminClient, input.campaignId)
  if (!flowRows.ok || flowRows.usesFallback) {
    return { ok: false as const, error: 'move_flow_step_failed' as const }
  }

  const currentIndex = flowRows.rows.findIndex((row) => row.id === input.stepId)
  if (currentIndex < 0) {
    return { ok: false as const, error: 'flow_step_not_found' as const }
  }

  const targetIndex = input.direction === 'up' ? currentIndex - 1 : currentIndex + 1
  if (targetIndex < 0 || targetIndex >= flowRows.rows.length) {
    return { ok: true as const }
  }

  const reordered = [...flowRows.rows]
  const [current] = reordered.splice(currentIndex, 1)
  reordered.splice(targetIndex, 0, current)

  await Promise.all(
    reordered.map((row, index) =>
      input.adminClient
        .from('campaign_flow_steps')
        .update({ sort_order: index, updated_at: new Date().toISOString() })
        .eq('id', row.id)
    )
  )

  await syncCampaignAssessmentSortOrders(input.adminClient, input.campaignId)

  return { ok: true as const }
}
