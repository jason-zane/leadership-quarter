import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'

type AdminClient = RouteAuthSuccess['adminClient']

export type InterpretationRulePayload = {
  targetType?: 'trait' | 'dimension' | 'overall'
  targetId?: string | null
  ruleType?: 'band_text' | 'coaching_tip' | 'risk_flag' | 'recommendation'
  minPercentile?: number
  maxPercentile?: number
  title?: string | null
  body?: string
  priority?: number
}

export async function listAdminInterpretationRules(input: {
  adminClient: AdminClient
  assessmentId: string
}) {
  const { data, error } = await input.adminClient
    .from('interpretation_rules')
    .select('id, assessment_id, target_type, target_id, rule_type, min_percentile, max_percentile, title, body, priority, created_at')
    .eq('assessment_id', input.assessmentId)
    .order('priority')
    .order('min_percentile')

  if (error) {
    return { ok: false as const, error: 'rules_fetch_failed' as const }
  }

  return { ok: true as const, data: { rules: data ?? [] } }
}

export async function createAdminInterpretationRule(input: {
  adminClient: AdminClient
  assessmentId: string
  payload: InterpretationRulePayload | null
}) {
  const body = String(input.payload?.body ?? '').trim()
  const targetType = input.payload?.targetType ?? 'overall'
  const ruleType = input.payload?.ruleType ?? 'band_text'

  if (!body) {
    return { ok: false as const, error: 'invalid_fields' as const }
  }

  const minPercentile = input.payload?.minPercentile ?? 0
  const maxPercentile = input.payload?.maxPercentile ?? 100

  if (minPercentile < 0 || maxPercentile > 100 || minPercentile >= maxPercentile) {
    return { ok: false as const, error: 'invalid_percentile_range' as const }
  }

  const { data, error } = await input.adminClient
    .from('interpretation_rules')
    .insert({
      assessment_id: input.assessmentId,
      target_type: targetType,
      target_id: input.payload?.targetId ?? null,
      rule_type: ruleType,
      min_percentile: minPercentile,
      max_percentile: maxPercentile,
      title: input.payload?.title ?? null,
      body,
      priority: input.payload?.priority ?? 0,
    })
    .select('id, assessment_id, target_type, target_id, rule_type, min_percentile, max_percentile, title, body, priority, created_at')
    .single()

  if (error || !data) {
    return { ok: false as const, error: 'rule_create_failed' as const, message: error?.message }
  }

  return { ok: true as const, data: { rule: data } }
}

export async function updateAdminInterpretationRule(input: {
  adminClient: AdminClient
  assessmentId: string
  ruleId: string
  payload: InterpretationRulePayload | null
}) {
  const updates: Record<string, unknown> = {}

  if (input.payload?.targetType) updates.target_type = input.payload.targetType
  if ('targetId' in (input.payload ?? {})) updates.target_id = input.payload?.targetId ?? null
  if (input.payload?.ruleType) updates.rule_type = input.payload.ruleType
  if (typeof input.payload?.minPercentile === 'number') updates.min_percentile = input.payload.minPercentile
  if (typeof input.payload?.maxPercentile === 'number') updates.max_percentile = input.payload.maxPercentile
  if ('title' in (input.payload ?? {})) updates.title = input.payload?.title ?? null
  if (typeof input.payload?.body === 'string') updates.body = input.payload.body.trim()
  if (typeof input.payload?.priority === 'number') updates.priority = input.payload.priority

  if (Object.keys(updates).length === 0) {
    return { ok: false as const, error: 'no_updates' as const }
  }

  const { data, error } = await input.adminClient
    .from('interpretation_rules')
    .update(updates)
    .eq('id', input.ruleId)
    .eq('assessment_id', input.assessmentId)
    .select('id, assessment_id, target_type, target_id, rule_type, min_percentile, max_percentile, title, body, priority, created_at')
    .single()

  if (error || !data) {
    return { ok: false as const, error: 'rule_update_failed' as const }
  }

  return { ok: true as const, data: { rule: data } }
}

export async function deleteAdminInterpretationRule(input: {
  adminClient: AdminClient
  assessmentId: string
  ruleId: string
}) {
  const { error } = await input.adminClient
    .from('interpretation_rules')
    .delete()
    .eq('id', input.ruleId)
    .eq('assessment_id', input.assessmentId)

  if (error) {
    return { ok: false as const, error: 'rule_delete_failed' as const }
  }

  return { ok: true as const }
}
