import { normalizeScoringConfig } from '@/utils/assessments/scoring-config'
import { getBands } from '@/utils/assessments/scoring-engine'
import { normalizeReportConfig, type ReportConfig } from '@/utils/assessments/experience-config'
import { resolveReportCompetencyOverride } from '@/utils/reports/report-overrides'
import { createAdminClient } from '@/utils/supabase/admin'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

type SubmissionRow = {
  id: string
  assessment_id: string
  campaign_id: string | null
  invitation_id: string | null
  created_at: string
  first_name: string | null
  last_name: string | null
  email: string | null
  organisation: string | null
  role: string | null
  scores: Record<string, number> | null
  bands: Record<string, string> | null
  classification: { key?: string; label?: string } | null
  recommendations: unknown[] | null
  assessments?:
    | { id?: string; key?: string; name?: string; description?: string | null; report_config?: unknown; scoring_config?: unknown }
    | { id?: string; key?: string; name?: string; description?: string | null; report_config?: unknown; scoring_config?: unknown }[]
    | null
  assessment_invitations?:
    | {
        first_name?: string | null
        last_name?: string | null
        email?: string | null
        organisation?: string | null
        role?: string | null
        status?: string | null
        completed_at?: string | null
        cohort_id?: string | null
      }
    | {
        first_name?: string | null
        last_name?: string | null
        email?: string | null
        organisation?: string | null
        role?: string | null
        status?: string | null
        completed_at?: string | null
        cohort_id?: string | null
      }[]
    | null
}

export type AssessmentReportData = {
  submissionId: string
  assessment: {
    id: string
    key: string
    name: string
    description: string | null
  }
  campaign: {
    externalName: string | null
    description: string | null
  } | null
  participant: {
    firstName: string | null
    lastName: string | null
    email: string | null
    organisation: string | null
    role: string | null
    status: string | null
    completedAt: string | null
    createdAt: string
  }
  scores: Record<string, number>
  bands: Record<string, string>
  classification: {
    key: string | null
    label: string | null
    description: string | null
  }
  dimensions: Array<{
    key: string
    label: string
    internalLabel: string
    descriptor: string
    description: string | null
    bandMeaning: string | null
    bandIndex: number
    bandCount: number
  }>
  traitScores: Array<{
    traitId: string
    traitCode: string
    traitName: string
    traitExternalName: string | null
    dimensionId: string | null
    dimensionCode: string | null
    dimensionName: string | null
    dimensionExternalName: string | null
    dimensionPosition: number | null
    rawScore: number
    zScore: number | null
    percentile: number | null
    band: string | null
    /** Cronbach's alpha from norm_stats — used to compute the SEM band in the participant report. */
    alpha: number | null
    /** Standard deviation from norm_stats — used with alpha to compute SEM. */
    normSd: number | null
  }>
  interpretations: Array<{
    targetType: string
    ruleType: string
    title: string | null
    body: string
    priority: number
  }>
  hasPsychometricData: boolean
  recommendations: string[]
  reportConfig: ReportConfig
}

function pickRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function formatDimensionLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim()
}

type ReportTraitScore = AssessmentReportData['traitScores'][number]

type InterpretationRuleRow = {
  target_type: string
  target_id: string | null
  rule_type: string
  min_percentile: number
  max_percentile: number
  title: string | null
  body: string
  priority: number
}

function buildDimensionOrderLookup(scoringConfig: unknown) {
  const normalized = normalizeScoringConfig(scoringConfig)
  return new Map(normalized.dimensions.map((dimension, index) => [dimension.key, index]))
}

function getTraitSortIndex(traitScore: ReportTraitScore, dimensionOrder: Map<string, number>) {
  if (traitScore.dimensionCode && dimensionOrder.has(traitScore.dimensionCode)) {
    return dimensionOrder.get(traitScore.dimensionCode) ?? Number.MAX_SAFE_INTEGER
  }

  if (dimensionOrder.has(traitScore.traitCode)) {
    return dimensionOrder.get(traitScore.traitCode) ?? Number.MAX_SAFE_INTEGER
  }

  if (typeof traitScore.dimensionPosition === 'number' && Number.isFinite(traitScore.dimensionPosition)) {
    return 1000 + traitScore.dimensionPosition
  }

  return Number.MAX_SAFE_INTEGER
}

export function sortAssessmentTraitScores(traitScores: ReportTraitScore[], scoringConfig: unknown) {
  const dimensionOrder = buildDimensionOrderLookup(scoringConfig)

  return [...traitScores].sort((left, right) => {
    const orderDiff = getTraitSortIndex(left, dimensionOrder) - getTraitSortIndex(right, dimensionOrder)
    if (orderDiff !== 0) return orderDiff

    const dimensionDiff = (left.dimensionName ?? '').localeCompare(right.dimensionName ?? '')
    if (dimensionDiff !== 0) return dimensionDiff

    return left.traitName.localeCompare(right.traitName)
  })
}

function isPercentileMatch(
  percentile: number | null | undefined,
  rule: Pick<InterpretationRuleRow, 'min_percentile' | 'max_percentile'>
) {
  return percentile !== null
    && percentile !== undefined
    && percentile >= rule.min_percentile
    && percentile <= rule.max_percentile
}

function averagePercentiles(values: number[]) {
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

export function resolveAssessmentInterpretations(
  traitScores: ReportTraitScore[],
  rules: InterpretationRuleRow[],
  scoringConfig: unknown
): AssessmentReportData['interpretations'] {
  if (traitScores.length === 0 || rules.length === 0) {
    return []
  }

  const orderedTraitScores = sortAssessmentTraitScores(traitScores, scoringConfig)
  const dimensionOrder = buildDimensionOrderLookup(scoringConfig)
  const traitPercentiles = new Map<string, number>()
  const dimensionPercentiles = new Map<string, number[]>()
  const traitOrder = new Map<string, number>()
  const dimensionOrderById = new Map<string, number>()

  orderedTraitScores.forEach((traitScore, index) => {
    traitOrder.set(traitScore.traitId, index)

    if (traitScore.percentile === null) return

    traitPercentiles.set(traitScore.traitId, traitScore.percentile)

    if (traitScore.dimensionId) {
      const values = dimensionPercentiles.get(traitScore.dimensionId) ?? []
      values.push(traitScore.percentile)
      dimensionPercentiles.set(traitScore.dimensionId, values)

      if (!dimensionOrderById.has(traitScore.dimensionId)) {
        dimensionOrderById.set(
          traitScore.dimensionId,
          getTraitSortIndex(traitScore, dimensionOrder)
        )
      }
    }
  })

  const dimensionPercentileLookup = new Map<string, number>()
  dimensionPercentiles.forEach((values, dimensionId) => {
    const average = averagePercentiles(values)
    if (average !== null) {
      dimensionPercentileLookup.set(dimensionId, average)
    }
  })

  const overallPercentile = averagePercentiles(Array.from(traitPercentiles.values()))

  return rules
    .flatMap((rule) => {
      if (rule.target_type === 'trait') {
        if (rule.target_id) {
          return isPercentileMatch(traitPercentiles.get(rule.target_id) ?? null, rule)
            ? [{
                targetType: rule.target_type,
                ruleType: rule.rule_type,
                title: rule.title,
                body: rule.body,
                priority: rule.priority,
                sortKey: traitOrder.get(rule.target_id) ?? Number.MAX_SAFE_INTEGER,
              }]
            : []
        }

        return traitScores.some((traitScore) => isPercentileMatch(traitScore.percentile, rule))
          ? [{
              targetType: rule.target_type,
              ruleType: rule.rule_type,
              title: rule.title,
              body: rule.body,
              priority: rule.priority,
              sortKey: Number.MAX_SAFE_INTEGER - 2,
            }]
          : []
      }

      if (rule.target_type === 'dimension') {
        if (rule.target_id) {
          return isPercentileMatch(dimensionPercentileLookup.get(rule.target_id) ?? null, rule)
            ? [{
                targetType: rule.target_type,
                ruleType: rule.rule_type,
                title: rule.title,
                body: rule.body,
                priority: rule.priority,
                sortKey: dimensionOrderById.get(rule.target_id) ?? Number.MAX_SAFE_INTEGER - 1,
              }]
            : []
        }

        return Array.from(dimensionPercentileLookup.values()).some((percentile) => isPercentileMatch(percentile, rule))
          ? [{
              targetType: rule.target_type,
              ruleType: rule.rule_type,
              title: rule.title,
              body: rule.body,
              priority: rule.priority,
              sortKey: Number.MAX_SAFE_INTEGER - 1,
            }]
          : []
      }

      return isPercentileMatch(overallPercentile, rule)
        ? [{
            targetType: rule.target_type,
            ruleType: rule.rule_type,
            title: rule.title,
            body: rule.body,
            priority: rule.priority,
            sortKey: Number.MAX_SAFE_INTEGER,
          }]
        : []
    })
    .sort((left, right) => {
      const priorityDiff = left.priority - right.priority
      if (priorityDiff !== 0) return priorityDiff

      const sortKeyDiff = left.sortKey - right.sortKey
      if (sortKeyDiff !== 0) return sortKeyDiff

      return (left.title ?? '').localeCompare(right.title ?? '')
    })
    .map((item) => {
      const { sortKey, ...rest } = item
      void sortKey
      return rest
    })
}

function resolveReportDimensions(
  rawBands: Record<string, string>,
  scores: Record<string, number>,
  scoringConfig: unknown,
  reportConfig: Pick<ReportConfig, 'competency_overrides'>,
  campaignCompetencyOverrides: ReportConfig['competency_overrides']
) {
  const normalized = normalizeScoringConfig(scoringConfig)

  let effectiveBands = rawBands
  if (Object.keys(rawBands).length === 0 && Object.keys(scores).length > 0) {
    effectiveBands = getBands(scores, normalized)
  }

  const seen = new Set<string>()

  const configuredDimensions = normalized.dimensions
    .map((dimension) => {
      const descriptor = effectiveBands[dimension.key]
      if (typeof descriptor !== 'string' || !descriptor.trim()) {
        return null
      }

      const bandIdx = dimension.bands.findIndex(
        (b) => b.label.trim().toLowerCase() === descriptor.trim().toLowerCase()
      )
      const matchedBand = bandIdx >= 0 ? dimension.bands[bandIdx] : undefined
      const resolvedOverride = resolveReportCompetencyOverride({
        dimensionKey: dimension.key,
        assessmentOverrides: reportConfig.competency_overrides,
        campaignOverrides: campaignCompetencyOverrides,
      })
      const internalLabel = dimension.label || formatDimensionLabel(dimension.key)

      seen.add(dimension.key)

      return {
        key: dimension.key,
        label: resolvedOverride?.label?.trim() || internalLabel,
        internalLabel,
        descriptor: matchedBand?.label ?? descriptor.trim(),
        description: resolvedOverride?.description?.trim() || (dimension.description ?? null),
        bandMeaning: matchedBand?.meaning ?? null,
        bandIndex: bandIdx >= 0 ? bandIdx : 0,
        bandCount: dimension.bands.length,
      }
    })
    .filter((dimension): dimension is NonNullable<typeof dimension> => dimension !== null)

  const fallbackDimensions = Object.entries(effectiveBands)
    .filter(([key, descriptor]) => !seen.has(key) && typeof descriptor === 'string' && descriptor.trim())
    .map(([key, descriptor]) => ({
      key,
      label: formatDimensionLabel(key),
      internalLabel: formatDimensionLabel(key),
      descriptor: descriptor.trim(),
      description: null,
      bandMeaning: null,
      bandIndex: 0,
      bandCount: 1,
    }))

  return [...configuredDimensions, ...fallbackDimensions]
}

function resolveClassificationDescription(
  classification: { key?: string; label?: string } | null | undefined,
  scoringConfig: unknown
) {
  if (!classification?.key && !classification?.label) {
    return null
  }

  const normalized = normalizeScoringConfig(scoringConfig)
  const matched = normalized.classifications.find((item) => {
    if (classification.key && item.key === classification.key) {
      return true
    }

    if (classification.label && item.label.trim().toLowerCase() === classification.label.trim().toLowerCase()) {
      return true
    }

    return false
  })

  return matched?.description ?? null
}

export function getAssessmentReportParticipantName(report: AssessmentReportData) {
  const fullName = [report.participant.firstName, report.participant.lastName].filter(Boolean).join(' ').trim()
  return fullName || 'Participant'
}

export function getAssessmentReportRecipientEmail(report: AssessmentReportData) {
  return report.participant.email?.trim().toLowerCase() || null
}

export function getAssessmentReportFilename(report: AssessmentReportData) {
  const name = getAssessmentReportParticipantName(report)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const assessment = report.assessment.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${assessment || 'assessment'}-${name || 'participant'}-report.pdf`
}

export async function getAssessmentReportData(
  adminClient: AdminClient,
  submissionId: string
): Promise<AssessmentReportData | null> {
  const { data, error } = await adminClient
    .from('assessment_submissions')
    .select(
      'id, assessment_id, campaign_id, invitation_id, created_at, first_name, last_name, email, organisation, role, scores, bands, classification, recommendations, assessments(id, key, name:external_name, description, report_config, scoring_config), assessment_invitations!survey_submissions_invitation_id_fkey(first_name, last_name, email, organisation, role, status, completed_at, cohort_id)'
    )
    .eq('id', submissionId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const row = data as SubmissionRow
  const assessment = pickRelation(row.assessments)
  if (!assessment?.id || !assessment.name || !assessment.key) {
    return null
  }

  const invitation = pickRelation(row.assessment_invitations)
  const resolvedBands = row.bands ?? {}

  // Fetch psychometric data (session_scores → trait_scores → traits → dimensions)
  const traitScores: AssessmentReportData['traitScores'] = []

  const { data: sessionRow } = await adminClient
    .from('session_scores')
    .select('id')
    .eq('submission_id', submissionId)
    .eq('status', 'ok')
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (sessionRow?.id) {
    const [tsResult, normGroupResult] = await Promise.all([
      adminClient
        .from('trait_scores')
        .select('trait_id, raw_score, z_score, percentile, band, assessment_traits(id, code, name, external_name, assessment_dimensions(id, code, name, external_name, position))')
        .eq('session_score_id', sessionRow.id),
      adminClient
        .from('session_scores')
        .select('norm_group_id')
        .eq('id', sessionRow.id)
        .maybeSingle(),
    ])

    // Load norm_stats (alpha + sd) for the session's norm group
    const normGroupId = normGroupResult.data?.norm_group_id ?? null
    const normStatsMap = new Map<string, { sd: number; alpha: number | null }>()
    if (normGroupId) {
      const { data: normStatRows } = await adminClient
        .from('norm_stats')
        .select('trait_id, sd, alpha')
        .eq('norm_group_id', normGroupId)
      for (const row of normStatRows ?? []) {
        normStatsMap.set(row.trait_id as string, {
          sd: row.sd as number,
          alpha: row.alpha as number | null,
        })
      }
    }

    for (const ts of tsResult.data ?? []) {
      const trait = Array.isArray(ts.assessment_traits)
        ? (ts.assessment_traits[0] ?? null)
        : ts.assessment_traits
      if (!trait) continue

      const dimensionRelation = (
        trait as {
          assessment_dimensions?:
            | { name: string }
            | Array<{ name: string }>
            | null
        }
      ).assessment_dimensions
      const dimension = Array.isArray(dimensionRelation)
        ? (dimensionRelation[0] ?? null)
        : (dimensionRelation ?? null)

      const traitId = ts.trait_id as string
      const normStats = normStatsMap.get(traitId) ?? null

      traitScores.push({
        traitId,
        traitCode: (trait as { code: string }).code,
        traitName: (trait as { name: string }).name,
        traitExternalName: (trait as { external_name?: string | null }).external_name ?? null,
        dimensionId: (dimension as { id?: string } | null)?.id ?? null,
        dimensionCode: (dimension as { code?: string } | null)?.code ?? null,
        dimensionName: (dimension as { name?: string } | null)?.name ?? null,
        dimensionExternalName: (dimension as { external_name?: string | null } | null)?.external_name ?? null,
        dimensionPosition: (dimension as { position?: number } | null)?.position ?? null,
        rawScore: ts.raw_score as number,
        zScore: ts.z_score as number | null,
        percentile: ts.percentile as number | null,
        band: ts.band as string | null,
        alpha: normStats?.alpha ?? null,
        normSd: normStats?.sd ?? null,
      })
    }
  }

  // Resolve campaign context via invitation → cohort → campaign
  let campaign: AssessmentReportData['campaign'] = null
  let resolvedCampaignId = row.campaign_id ?? null
  const cohortId = (invitation as { cohort_id?: string | null } | null)?.cohort_id ?? null
  if (cohortId) {
    const { data: cohortRow } = await adminClient
      .from('assessment_cohorts')
      .select('campaign_id, campaigns(external_name, description)')
      .eq('id', cohortId)
      .maybeSingle()

    if (cohortRow?.campaign_id) {
      resolvedCampaignId = resolvedCampaignId ?? cohortRow.campaign_id
      const campaignRelation = cohortRow.campaigns
      const campaignData = Array.isArray(campaignRelation)
        ? (campaignRelation[0] ?? null)
        : (campaignRelation ?? null)

      if (campaignData) {
        campaign = {
          externalName: (campaignData as { external_name?: string | null }).external_name ?? null,
          description: (campaignData as { description?: string | null }).description ?? null,
        }
      }
    }
  }

  let campaignCompetencyOverrides: ReportConfig['competency_overrides'] = {}
  if (resolvedCampaignId) {
    const { data: campaignAssessmentRow } = await adminClient
      .from('campaign_assessments')
      .select('report_overrides')
      .eq('campaign_id', resolvedCampaignId)
      .eq('assessment_id', row.assessment_id)
      .maybeSingle()

    if (campaignAssessmentRow?.report_overrides) {
      const reportOverrides = campaignAssessmentRow.report_overrides as {
        competency_overrides?: ReportConfig['competency_overrides']
      }
      campaignCompetencyOverrides = reportOverrides.competency_overrides ?? {}
    }
  }

  const normalizedReportConfig = normalizeReportConfig(assessment.report_config)

  const orderedTraitScores = sortAssessmentTraitScores(traitScores, assessment.scoring_config)
  let interpretations: AssessmentReportData['interpretations'] = []

  if (orderedTraitScores.length > 0) {
    const { data: ruleRows } = await adminClient
      .from('interpretation_rules')
      .select('target_type, target_id, rule_type, min_percentile, max_percentile, title, body, priority')
      .eq('assessment_id', assessment.id)
      .order('priority')
      .order('min_percentile')

    interpretations = resolveAssessmentInterpretations(
      orderedTraitScores,
      (ruleRows ?? []) as InterpretationRuleRow[],
      assessment.scoring_config
    )
  }

  return {
    submissionId: row.id,
    assessment: {
      id: assessment.id,
      key: assessment.key,
      name: assessment.name,
      description: (assessment as { description?: string | null }).description ?? null,
    },
    campaign,
    participant: {
      firstName: row.first_name ?? invitation?.first_name ?? null,
      lastName: row.last_name ?? invitation?.last_name ?? null,
      email: row.email ?? invitation?.email ?? null,
      organisation: row.organisation ?? invitation?.organisation ?? null,
      role: row.role ?? invitation?.role ?? null,
      status: invitation?.status ?? null,
      completedAt: invitation?.completed_at ?? null,
      createdAt: row.created_at,
    },
    scores: row.scores ?? {},
    bands: resolvedBands,
    classification: {
      key: row.classification?.key ?? null,
      label: row.classification?.label ?? null,
      description: resolveClassificationDescription(row.classification, assessment.scoring_config),
    },
    dimensions: resolveReportDimensions(
      resolvedBands,
      row.scores ?? {},
      assessment.scoring_config,
      normalizedReportConfig,
      campaignCompetencyOverrides
    ),
    traitScores: orderedTraitScores,
    interpretations,
    hasPsychometricData: traitScores.length > 0,
    recommendations: Array.isArray(row.recommendations)
      ? row.recommendations.map((item) => String(item))
      : [],
    reportConfig: normalizedReportConfig,
  }
}
