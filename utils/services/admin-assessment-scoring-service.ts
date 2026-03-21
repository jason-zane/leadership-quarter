import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'
import {
  createEmptyV2ScoringConfig,
  normalizeV2ScoringConfig,
} from '@/utils/assessments/assessment-scoring'
import {
  isAiOrientationAssessmentKey,
  withAiOrientationDerivedOutcomeSeed,
} from '@/utils/assessments/assessment-derived-outcome-seeds'

type AdminClient = RouteAuthSuccess['adminClient']

function isMissingV2ScoringColumn(error: { message?: string; details?: string | null; hint?: string | null } | null | undefined) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ').toLowerCase()
  return text.includes('v2_scoring_config') && (text.includes('column') || text.includes('schema cache'))
}

async function loadAssessmentRecord(adminClient: AdminClient, assessmentId: string) {
  const primary = await adminClient
    .from('assessments')
    .select('id, key, v2_scoring_config, report_config')
    .eq('id', assessmentId)
    .maybeSingle()

  if (!primary.error || !isMissingV2ScoringColumn(primary.error)) {
    return primary
  }

  const fallback = await adminClient
    .from('assessments')
    .select('id, key, report_config')
    .eq('id', assessmentId)
    .maybeSingle()

  if (fallback.error || !fallback.data) {
    return fallback
  }

  const reportConfig = (fallback.data.report_config ?? {}) as Record<string, unknown>
  return {
    data: {
      id: fallback.data.id,
      key: 'key' in fallback.data ? fallback.data.key : null,
      report_config: fallback.data.report_config,
      v2_scoring_config: reportConfig.v2_scoring_config ?? null,
    },
    error: null,
  }
}

function getScoringValue(record: unknown) {
  if (!record || typeof record !== 'object') return null
  return 'v2_scoring_config' in record ? (record as { v2_scoring_config?: unknown }).v2_scoring_config ?? null : null
}

export async function getAdminAssessmentV2ScoringConfig(input: {
  adminClient: AdminClient
  assessmentId: string
}) {
  const { data, error } = await loadAssessmentRecord(input.adminClient, input.assessmentId)
  if (error || !data) {
    return { ok: false as const, error: 'assessment_not_found' as const }
  }

  const assessmentKey =
    typeof data === 'object' && data && 'key' in data && typeof data.key === 'string'
      ? data.key
      : null
  const normalized = normalizeV2ScoringConfig(getScoringValue(data))

  return {
    ok: true as const,
    data: {
      scoringConfig: isAiOrientationAssessmentKey(assessmentKey)
        ? withAiOrientationDerivedOutcomeSeed(normalized)
        : normalized,
    },
  }
}

export async function saveAdminAssessmentV2ScoringConfig(input: {
  adminClient: AdminClient
  assessmentId: string
  scoringConfig: unknown
}) {
  const normalized = normalizeV2ScoringConfig(input.scoringConfig ?? createEmptyV2ScoringConfig())

  const primary = await input.adminClient
    .from('assessments')
    .update({
      v2_scoring_config: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.assessmentId)
    .select('id, v2_scoring_config, report_config')
    .maybeSingle()

  if (!primary.error && primary.data) {
    return {
      ok: true as const,
      data: {
        scoringConfig: normalizeV2ScoringConfig(primary.data.v2_scoring_config),
      },
    }
  }

  if (!isMissingV2ScoringColumn(primary.error)) {
    return { ok: false as const, error: 'scoring_config_save_failed' as const, message: primary.error?.message }
  }

  const current = await input.adminClient
    .from('assessments')
    .select('id, report_config')
    .eq('id', input.assessmentId)
    .maybeSingle()

  if (current.error || !current.data) {
    return { ok: false as const, error: 'scoring_config_save_failed' as const, message: current.error?.message }
  }

  const currentReportConfig = (current.data.report_config ?? {}) as Record<string, unknown>
  const fallback = await input.adminClient
    .from('assessments')
    .update({
      report_config: {
        ...currentReportConfig,
        v2_scoring_config: normalized,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.assessmentId)
    .select('id, report_config')
    .maybeSingle()

  if (fallback.error || !fallback.data) {
    return { ok: false as const, error: 'scoring_config_save_failed' as const, message: fallback.error?.message }
  }

  const reportConfig = (fallback.data.report_config ?? {}) as Record<string, unknown>
  return {
    ok: true as const,
    data: {
      scoringConfig: normalizeV2ScoringConfig(reportConfig.v2_scoring_config),
    },
  }
}
