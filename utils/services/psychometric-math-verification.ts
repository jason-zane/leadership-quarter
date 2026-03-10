import crypto from 'node:crypto'
import {
  loadAssessmentPsychometricStructure,
  resolveKeyedItemValue,
  type PsychometricStructure,
} from '@/utils/assessments/psychometric-structure'
import { resolveNormGroupSubmissionIds } from '@/utils/assessments/norm-group-filters'
import { mean, sampleSD } from '@/utils/stats/engine'
import { createAdminClient } from '@/utils/supabase/admin'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

type SessionScoreRow = {
  id: string
  submission_id: string
  input_hash: string | null
  engine_version: number | null
  computed_at: string
}

type SubmissionRow = {
  id: string
  responses: Record<string, number> | null
  excluded_from_analysis: boolean
}

type TraitScoreRow = {
  session_score_id: string
  trait_id: string
  raw_score: number
}

type DimensionScoreRow = {
  session_score_id: string
  dimension_id: string
  raw_score: number
}

type NormGroupRow = {
  id: string
  name: string
  filters: Record<string, unknown> | null
  n: number
}

type NormStatRow = {
  norm_group_id: string
  trait_id: string
  mean: number
  sd: number
}

type DimensionNormStatRow = {
  norm_group_id: string
  dimension_id: string
  mean: number
  sd: number
}

export type PsychometricMathCheckStatus = 'pass' | 'warning' | 'fail' | 'info'

export type PsychometricMathCheck = {
  code: string
  title: string
  status: PsychometricMathCheckStatus
  summary: string
  details: string[]
}

export type PsychometricMathVerificationReport = {
  status: PsychometricMathCheckStatus
  verifiedAt: string
  checks: PsychometricMathCheck[]
  metrics: {
    sessionsChecked: number
    currentConfigSessions: number
    staleConfigSessions: number
    normGroupsChecked: number
  }
}

type ScoreMapComparison = {
  compared: number
  missing: number
  extra: number
  mismatched: number
  maxDelta: number
}

type SessionScoreComparison = {
  traits: ScoreMapComparison
  dimensions: ScoreMapComparison
}

type NormStatComparison = {
  compared: number
  missingStored: number
  missingLive: number
  mismatched: number
  maxMeanDelta: number
  maxSdDelta: number
}

const SCORE_TOLERANCE = 0.0001
// 5× max per-value rounding error from 4dp storage; see docs/psychometric-platform-audit-and-plan.md
const NORM_TOLERANCE = 0.005

function buildInputHash(value: unknown) {
  return crypto.createHash('sha1').update(JSON.stringify(value)).digest('hex')
}

function statusWeight(status: PsychometricMathCheckStatus) {
  switch (status) {
    case 'fail':
      return 4
    case 'warning':
      return 3
    case 'info':
      return 2
    default:
      return 1
  }
}

export function mergePsychometricMathStatuses(
  statuses: PsychometricMathCheckStatus[]
): PsychometricMathCheckStatus {
  if (statuses.length === 0) return 'info'
  return statuses.reduce((worst, current) =>
    statusWeight(current) > statusWeight(worst) ? current : worst
  )
}

export function buildPsychometricInputHash(
  assessmentId: string,
  structure: Pick<PsychometricStructure, 'traitScales'>
) {
  return buildInputHash({
    assessmentId,
    scales: structure.traitScales.map((scale) => ({
      key: scale.key,
      items: scale.items.map((item) => ({
        questionKey: item.questionKey,
        weight: item.weight,
        reverseScored: item.reverseScored,
      })),
    })),
  })
}

export function computeExpectedPsychometricScores(
  structure: Pick<PsychometricStructure, 'traitScales'>,
  responses: Record<string, number>
) {
  const traitScores = new Map<string, number>()
  const dimensionScores = new Map<string, number>()
  const dimensionAccumulator = new Map<string, number[]>()

  for (const scale of structure.traitScales) {
    let weightedSum = 0
    let totalWeight = 0

    for (const item of scale.items) {
      const value = resolveKeyedItemValue(item, responses)
      if (value === null) continue
      weightedSum += value * item.weight
      totalWeight += item.weight
    }

    if (!scale.traitId || totalWeight === 0) continue

    const rawScore = weightedSum / totalWeight
    traitScores.set(scale.traitId, rawScore)

    if (scale.dimensionId) {
      const scores = dimensionAccumulator.get(scale.dimensionId) ?? []
      scores.push(rawScore)
      dimensionAccumulator.set(scale.dimensionId, scores)
    }
  }

  for (const [dimensionId, scores] of dimensionAccumulator) {
    dimensionScores.set(dimensionId, mean(scores))
  }

  return { traitScores, dimensionScores }
}

function compareScoreMaps(input: {
  expected: Map<string, number>
  stored: Map<string, number>
  tolerance?: number
}): ScoreMapComparison {
  const tolerance = input.tolerance ?? SCORE_TOLERANCE
  let compared = 0
  let missing = 0
  let extra = 0
  let mismatched = 0
  let maxDelta = 0

  for (const [key, expectedValue] of input.expected) {
    const storedValue = input.stored.get(key)
    if (storedValue === undefined) {
      missing++
      continue
    }
    compared++
    const delta = Math.abs(expectedValue - storedValue)
    maxDelta = Math.max(maxDelta, delta)
    if (delta > tolerance) {
      mismatched++
    }
  }

  for (const key of input.stored.keys()) {
    if (!input.expected.has(key)) {
      extra++
    }
  }

  return {
    compared,
    missing,
    extra,
    mismatched,
    maxDelta,
  }
}

export function comparePsychometricSessionScores(input: {
  expectedTraitScores: Map<string, number>
  expectedDimensionScores: Map<string, number>
  storedTraitScores: Map<string, number>
  storedDimensionScores: Map<string, number>
  tolerance?: number
}): SessionScoreComparison {
  return {
    traits: compareScoreMaps({
      expected: input.expectedTraitScores,
      stored: input.storedTraitScores,
      tolerance: input.tolerance,
    }),
    dimensions: compareScoreMaps({
      expected: input.expectedDimensionScores,
      stored: input.storedDimensionScores,
      tolerance: input.tolerance,
    }),
  }
}

function valuesByKeyFromRows<T extends { raw_score: number }>(
  rows: T[],
  keyOf: (row: T) => string
) {
  const valuesByKey = new Map<string, number[]>()

  for (const row of rows) {
    const key = keyOf(row)
    const values = valuesByKey.get(key) ?? []
    values.push(Number(row.raw_score))
    valuesByKey.set(key, values)
  }

  return valuesByKey
}

export function compareNormStatSet(input: {
  storedStats: Array<{ key: string; mean: number; sd: number }>
  valuesByKey: Map<string, number[]>
  tolerance?: number
}): NormStatComparison {
  const tolerance = input.tolerance ?? NORM_TOLERANCE
  let compared = 0
  let missingStored = 0
  let missingLive = 0
  let mismatched = 0
  let maxMeanDelta = 0
  let maxSdDelta = 0

  const storedKeySet = new Set(input.storedStats.map((stat) => stat.key))

  for (const stat of input.storedStats) {
    const values = input.valuesByKey.get(stat.key)
    if (!values || values.length === 0) {
      missingLive++
      continue
    }

    compared++
    const liveMean = mean(values)
    const liveSd = sampleSD(values) ?? 0
    const meanDelta = Math.abs(liveMean - stat.mean)
    const sdDelta = Math.abs(liveSd - stat.sd)

    maxMeanDelta = Math.max(maxMeanDelta, meanDelta)
    maxSdDelta = Math.max(maxSdDelta, sdDelta)

    if (meanDelta > tolerance || sdDelta > tolerance) {
      mismatched++
    }
  }

  for (const [key, values] of input.valuesByKey) {
    if (values.length === 0) continue
    if (!storedKeySet.has(key)) {
      missingStored++
    }
  }

  return {
    compared,
    missingStored,
    missingLive,
    mismatched,
    maxMeanDelta,
    maxSdDelta,
  }
}

async function buildScoreVerificationCheck(input: {
  adminClient: AdminClient
  assessmentId: string
  structure: PsychometricStructure
  recentSessionLimit: number
}) {
  const currentInputHash = buildPsychometricInputHash(input.assessmentId, input.structure)
  const { data: sessionsData, error: sessionsError } = await input.adminClient
    .from('session_scores')
    .select('id, submission_id, input_hash, engine_version, computed_at')
    .eq('assessment_id', input.assessmentId)
    .eq('status', 'ok')
    .eq('engine_type', 'psychometric')
    .order('computed_at', { ascending: false })
    .limit(Math.max(input.recentSessionLimit * 4, input.recentSessionLimit))

  if (sessionsError) {
    return {
      check: {
        code: 'score_recomputation',
        title: 'Score recomputation',
        status: 'warning' as const,
        summary: 'The score verification pass could not load recent psychometric sessions.',
        details: [sessionsError.message],
      },
      metrics: {
        sessionsChecked: 0,
        currentConfigSessions: 0,
        staleConfigSessions: 0,
      },
    }
  }

  const sessions = (sessionsData ?? []) as SessionScoreRow[]

  if (input.structure.traitScales.length === 0) {
    return {
      check: {
        code: 'score_recomputation',
        title: 'Score recomputation',
        status: 'info' as const,
        summary: 'No trait-mapped psychometric model is configured yet, so there is nothing to recompute.',
        details: ['Create trait mappings before expecting live score verification.'],
      },
      metrics: {
        sessionsChecked: sessions.length,
        currentConfigSessions: 0,
        staleConfigSessions: 0,
      },
    }
  }

  if (sessions.length === 0) {
    return {
      check: {
        code: 'score_recomputation',
        title: 'Score recomputation',
        status: 'info' as const,
        summary: 'No psychometric sessions are available yet, so the score math cannot be verified from live submissions.',
        details: ['Submit at least one psychometric session to activate live recomputation checks.'],
      },
      metrics: {
        sessionsChecked: 0,
        currentConfigSessions: 0,
        staleConfigSessions: 0,
      },
    }
  }

  const submissionIds = sessions.map((session) => session.submission_id)
  const sessionIds = sessions.map((session) => session.id)

  const [submissionsResult, traitScoresResult, dimensionScoresResult] = await Promise.all([
    input.adminClient
      .from('assessment_submissions')
      .select('id, responses, excluded_from_analysis')
      .in('id', submissionIds),
    input.adminClient
      .from('trait_scores')
      .select('session_score_id, trait_id, raw_score')
      .in('session_score_id', sessionIds),
    input.adminClient
      .from('dimension_scores')
      .select('session_score_id, dimension_id, raw_score')
      .in('session_score_id', sessionIds),
  ])

  if (submissionsResult.error || traitScoresResult.error || dimensionScoresResult.error) {
    const messages = [
      submissionsResult.error?.message,
      traitScoresResult.error?.message,
      dimensionScoresResult.error?.message,
    ].filter(Boolean) as string[]

    return {
      check: {
        code: 'score_recomputation',
        title: 'Score recomputation',
        status: 'warning' as const,
        summary: 'The score verification pass could not load all supporting rows.',
        details: messages.length > 0 ? messages : ['Unknown verification fetch error.'],
      },
      metrics: {
        sessionsChecked: sessions.length,
        currentConfigSessions: 0,
        staleConfigSessions: 0,
      },
    }
  }

  const submissionsById = new Map(
    ((submissionsResult.data ?? []) as SubmissionRow[]).map((submission) => [submission.id, submission])
  )
  const traitScoresBySession = new Map<string, Map<string, number>>()
  const dimensionScoresBySession = new Map<string, Map<string, number>>()

  for (const row of (traitScoresResult.data ?? []) as TraitScoreRow[]) {
    const scores = traitScoresBySession.get(row.session_score_id) ?? new Map<string, number>()
    scores.set(row.trait_id, Number(row.raw_score))
    traitScoresBySession.set(row.session_score_id, scores)
  }

  for (const row of (dimensionScoresResult.data ?? []) as DimensionScoreRow[]) {
    const scores = dimensionScoresBySession.get(row.session_score_id) ?? new Map<string, number>()
    scores.set(row.dimension_id, Number(row.raw_score))
    dimensionScoresBySession.set(row.session_score_id, scores)
  }

  let currentConfigSessions = 0
  let staleConfigSessions = 0
  let failedCurrentSessions = 0
  let missingSubmissionCount = 0
  let ignoredSubmissionCount = 0
  let totalScoreMismatches = 0
  let maxObservedDelta = 0
  const oldEngineVersions = new Set<number>()

  for (const session of sessions) {
    if (typeof session.engine_version === 'number' && session.engine_version < 2) {
      oldEngineVersions.add(session.engine_version)
    }

    const submission = submissionsById.get(session.submission_id)
    if (!submission) {
      missingSubmissionCount++
      continue
    }

    if (submission.excluded_from_analysis) {
      ignoredSubmissionCount++
      continue
    }

    if (session.input_hash !== currentInputHash) {
      staleConfigSessions++
      continue
    }

    currentConfigSessions++

    const expected = computeExpectedPsychometricScores(
      input.structure,
      (submission.responses ?? {}) as Record<string, number>
    )

    const comparison = comparePsychometricSessionScores({
      expectedTraitScores: expected.traitScores,
      expectedDimensionScores: expected.dimensionScores,
      storedTraitScores: traitScoresBySession.get(session.id) ?? new Map<string, number>(),
      storedDimensionScores: dimensionScoresBySession.get(session.id) ?? new Map<string, number>(),
    })

    const mismatchCount =
      comparison.traits.missing +
      comparison.traits.extra +
      comparison.traits.mismatched +
      comparison.dimensions.missing +
      comparison.dimensions.extra +
      comparison.dimensions.mismatched

    totalScoreMismatches += mismatchCount
    maxObservedDelta = Math.max(
      maxObservedDelta,
      comparison.traits.maxDelta,
      comparison.dimensions.maxDelta
    )

    if (mismatchCount > 0) {
      failedCurrentSessions++
    }
  }

  const details: string[] = []
  if (staleConfigSessions > 0) {
    details.push(
      `${staleConfigSessions} recent session${staleConfigSessions === 1 ? '' : 's'} were scored under an older input hash. That signals configuration drift, not necessarily broken arithmetic.`
    )
  }
  if (missingSubmissionCount > 0) {
    details.push(
      `${missingSubmissionCount} session${missingSubmissionCount === 1 ? '' : 's'} could not be recomputed because the source submission rows were not available.`
    )
  }
  if (ignoredSubmissionCount > 0) {
    details.push(
      `${ignoredSubmissionCount} recent session${ignoredSubmissionCount === 1 ? '' : 's'} were skipped because their submissions are marked “ignore from analysis”.`
    )
  }
  if (oldEngineVersions.size > 0) {
    details.push(
      `Older engine versions detected in the verification sample: ${Array.from(oldEngineVersions).sort((a, b) => a - b).join(', ')}.`
    )
  }
  if (maxObservedDelta > 0) {
    details.push(`Largest raw-score delta observed was ${maxObservedDelta.toFixed(4)}.`)
  }

  let status: PsychometricMathCheckStatus = 'pass'
  let summary = `${currentConfigSessions} recent current-configuration session${currentConfigSessions === 1 ? '' : 's'} matched a fresh recomputation from raw item responses.`

  if (currentConfigSessions === 0 && staleConfigSessions > 0) {
    status = 'warning'
    summary = 'Recent sessions exist, but they were all scored under an older configuration, so current-model math could not be fully verified.'
  } else if (currentConfigSessions === 0) {
    status = 'info'
    summary =
      ignoredSubmissionCount > 0
        ? 'No current-configuration psychometric sessions are currently in analysis, so live score verification could not run.'
        : 'No current-configuration psychometric sessions were available for live score verification.'
  } else if (failedCurrentSessions > 0 || missingSubmissionCount > 0) {
    status = 'fail'
    summary = `${failedCurrentSessions} of ${currentConfigSessions} current-configuration session${currentConfigSessions === 1 ? '' : 's'} did not match a fresh recomputation.`
  } else if (staleConfigSessions > 0) {
    status = 'warning'
    summary = `${currentConfigSessions} current-configuration sessions matched, but ${staleConfigSessions} older session${staleConfigSessions === 1 ? '' : 's'} should be rescored if you want full parity.`
  }

  if (details.length === 0) {
    details.push(
      'This check recomputes trait and dimension raw scores from the saved item responses and compares them to stored score rows within a tolerance of 0.0001.'
    )
  }

  return {
    check: {
      code: 'score_recomputation',
      title: 'Score recomputation',
      status,
      summary,
      details,
    },
    metrics: {
      sessionsChecked: sessions.length,
      currentConfigSessions,
      staleConfigSessions,
      totalScoreMismatches,
    },
  }
}

async function buildNormVerificationCheck(input: {
  adminClient: AdminClient
  assessmentId: string
}) {
  const { data: normGroupsData, error: normGroupsError } = await input.adminClient
    .from('norm_groups')
    .select('id, name, filters, n')
    .eq('assessment_id', input.assessmentId)
    .order('created_at', { ascending: true })

  if (normGroupsError) {
    return {
      check: {
        code: 'norm_recomputation',
        title: 'Norm recomputation',
        status: 'warning' as const,
        summary: 'Norm verification could not load the configured norm groups.',
        details: [normGroupsError.message],
      },
      metrics: {
        normGroupsChecked: 0,
      },
    }
  }

  const normGroups = (normGroupsData ?? []) as NormGroupRow[]
  if (normGroups.length === 0) {
    return {
      check: {
        code: 'norm_recomputation',
        title: 'Norm recomputation',
        status: 'info' as const,
        summary: 'No norm groups are configured yet, so there are no stored benchmarks to verify.',
        details: ['Create and compute at least one norm group to activate norm verification.'],
      },
      metrics: {
        normGroupsChecked: 0,
      },
    }
  }

  const groupIds = normGroups.map((group) => group.id)
  const [normStatsResult, dimensionNormStatsResult] = await Promise.all([
    input.adminClient
      .from('norm_stats')
      .select('norm_group_id, trait_id, mean, sd')
      .in('norm_group_id', groupIds),
    input.adminClient
      .from('dimension_norm_stats')
      .select('norm_group_id, dimension_id, mean, sd')
      .in('norm_group_id', groupIds),
  ])

  if (normStatsResult.error || dimensionNormStatsResult.error) {
    const messages = [normStatsResult.error?.message, dimensionNormStatsResult.error?.message].filter(
      Boolean
    ) as string[]

    return {
      check: {
        code: 'norm_recomputation',
        title: 'Norm recomputation',
        status: 'warning' as const,
        summary: 'Norm verification could not load the stored norm statistics.',
        details: messages.length > 0 ? messages : ['Unknown norm verification fetch error.'],
      },
      metrics: {
        normGroupsChecked: normGroups.length,
      },
    }
  }

  const traitStatsByGroup = new Map<string, NormStatRow[]>()
  const dimensionStatsByGroup = new Map<string, DimensionNormStatRow[]>()

  for (const row of (normStatsResult.data ?? []) as NormStatRow[]) {
    const rows = traitStatsByGroup.get(row.norm_group_id) ?? []
    rows.push(row)
    traitStatsByGroup.set(row.norm_group_id, rows)
  }

  for (const row of (dimensionNormStatsResult.data ?? []) as DimensionNormStatRow[]) {
    const rows = dimensionStatsByGroup.get(row.norm_group_id) ?? []
    rows.push(row)
    dimensionStatsByGroup.set(row.norm_group_id, rows)
  }

  const driftedGroups: string[] = []
  const groupsNeedingCompute: string[] = []
  const countMismatchGroups: string[] = []
  let maxMeanDelta = 0
  let maxSdDelta = 0

  for (const group of normGroups) {
    const traitStats = traitStatsByGroup.get(group.id) ?? []
    const dimensionStats = dimensionStatsByGroup.get(group.id) ?? []

    if (traitStats.length === 0 && dimensionStats.length === 0) {
      groupsNeedingCompute.push(group.name)
      continue
    }

    const submissionMatchResult = await resolveNormGroupSubmissionIds({
      adminClient: input.adminClient,
      assessmentId: input.assessmentId,
      filters: group.filters ?? null,
    })

    if (!submissionMatchResult.ok) {
      driftedGroups.push(group.name)
      continue
    }

    const matchedSubmissionIds = submissionMatchResult.data.submissionIds
    let sessionIds: string[] = []

    if (matchedSubmissionIds.length > 0) {
      const { data: sessionsData, error: sessionsError } = await input.adminClient
        .from('session_scores')
        .select('id')
        .eq('assessment_id', input.assessmentId)
        .eq('status', 'ok')
        .in('submission_id', matchedSubmissionIds)

      if (sessionsError) {
        driftedGroups.push(group.name)
        continue
      }

      sessionIds = (sessionsData ?? []).map((session) => session.id as string)
    }

    if (group.n !== sessionIds.length) {
      countMismatchGroups.push(group.name)
    }

    if (sessionIds.length === 0) {
      if (traitStats.length > 0 || dimensionStats.length > 0) {
        driftedGroups.push(group.name)
      }
      continue
    }

    const [traitScoresResult, dimensionScoresResult] = await Promise.all([
      input.adminClient
        .from('trait_scores')
        .select('trait_id, raw_score')
        .in('session_score_id', sessionIds),
      input.adminClient
        .from('dimension_scores')
        .select('dimension_id, raw_score')
        .in('session_score_id', sessionIds),
    ])

    if (traitScoresResult.error || dimensionScoresResult.error) {
      driftedGroups.push(group.name)
      continue
    }

    const traitComparison = compareNormStatSet({
      storedStats: traitStats.map((stat) => ({
        key: stat.trait_id,
        mean: Number(stat.mean),
        sd: Number(stat.sd),
      })),
      valuesByKey: valuesByKeyFromRows((traitScoresResult.data ?? []) as Array<{ trait_id: string; raw_score: number }>, (row) => row.trait_id),
    })

    const dimensionComparison = compareNormStatSet({
      storedStats: dimensionStats.map((stat) => ({
        key: stat.dimension_id,
        mean: Number(stat.mean),
        sd: Number(stat.sd),
      })),
      valuesByKey: valuesByKeyFromRows(
        (dimensionScoresResult.data ?? []) as Array<{ dimension_id: string; raw_score: number }>,
        (row) => row.dimension_id
      ),
    })

    maxMeanDelta = Math.max(maxMeanDelta, traitComparison.maxMeanDelta, dimensionComparison.maxMeanDelta)
    maxSdDelta = Math.max(maxSdDelta, traitComparison.maxSdDelta, dimensionComparison.maxSdDelta)

    const hasDrift =
      traitComparison.missingStored > 0 ||
      traitComparison.missingLive > 0 ||
      traitComparison.mismatched > 0 ||
      dimensionComparison.missingStored > 0 ||
      dimensionComparison.missingLive > 0 ||
      dimensionComparison.mismatched > 0

    if (hasDrift) {
      driftedGroups.push(group.name)
    }
  }

  const details: string[] = []
  if (groupsNeedingCompute.length > 0) {
    details.push(
      `${groupsNeedingCompute.length} group${groupsNeedingCompute.length === 1 ? '' : 's'} still need computed norms: ${groupsNeedingCompute.slice(0, 3).join(', ')}${groupsNeedingCompute.length > 3 ? ', …' : ''}.`
    )
  }
  if (countMismatchGroups.length > 0) {
    details.push(
      `${countMismatchGroups.length} group${countMismatchGroups.length === 1 ? '' : 's'} have saved n values that do not match the currently filtered session count.`
    )
  }
  if (driftedGroups.length > 0) {
    details.push(
      `${driftedGroups.length} group${driftedGroups.length === 1 ? '' : 's'} showed stored-stat drift or missing norm rows: ${driftedGroups.slice(0, 3).join(', ')}${driftedGroups.length > 3 ? ', …' : ''}.`
    )
  }
  if (maxMeanDelta > 0 || maxSdDelta > 0) {
    details.push(
      `Largest norm delta observed was mean ${maxMeanDelta.toFixed(4)} and SD ${maxSdDelta.toFixed(4)}.`
    )
  }

  let status: PsychometricMathCheckStatus = 'pass'
  let summary = `${normGroups.length} norm group${normGroups.length === 1 ? '' : 's'} matched the currently filtered score distributions.`
  const failingGroups = new Set([...driftedGroups, ...countMismatchGroups])

  if (failingGroups.size > 0) {
    status = 'fail'
    summary = `${failingGroups.size} norm group${failingGroups.size === 1 ? '' : 's'} showed stored-count drift or norm-stat mismatch during recomputation.`
  } else if (groupsNeedingCompute.length > 0) {
    status = 'warning'
    summary = `${normGroups.length - groupsNeedingCompute.length} norm group${normGroups.length - groupsNeedingCompute.length === 1 ? '' : 's'} are verified, but ${groupsNeedingCompute.length} still need computation.`
  }

  if (details.length === 0) {
    details.push(
      'This check rebuilds each saved norm group from its filters and compares the stored means and SDs to the current trait and dimension score distributions.'
    )
  }

  return {
    check: {
      code: 'norm_recomputation',
      title: 'Norm recomputation',
      status,
      summary,
      details,
    },
    metrics: {
      normGroupsChecked: normGroups.length,
    },
  }
}

export async function getPsychometricMathVerification(input: {
  adminClient: AdminClient
  assessmentId: string
  recentSessionLimit?: number
}): Promise<PsychometricMathVerificationReport> {
  const verifiedAt = new Date().toISOString()

  try {
    const structure = await loadAssessmentPsychometricStructure(input.adminClient, input.assessmentId)
    const recentSessionLimit = input.recentSessionLimit ?? 24

    const [scoreResult, normResult] = await Promise.all([
      buildScoreVerificationCheck({
        adminClient: input.adminClient,
        assessmentId: input.assessmentId,
        structure,
        recentSessionLimit,
      }),
      buildNormVerificationCheck({
        adminClient: input.adminClient,
        assessmentId: input.assessmentId,
      }),
    ])

    const checks = [scoreResult.check, normResult.check]

    return {
      status: mergePsychometricMathStatuses(checks.map((check) => check.status)),
      verifiedAt,
      checks,
      metrics: {
        sessionsChecked: scoreResult.metrics.sessionsChecked,
        currentConfigSessions: scoreResult.metrics.currentConfigSessions,
        staleConfigSessions: scoreResult.metrics.staleConfigSessions,
        normGroupsChecked: normResult.metrics.normGroupsChecked,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown verification failure.'

    return {
      status: 'warning',
      verifiedAt,
      checks: [
        {
          code: 'verification_runtime_error',
          title: 'Verification runtime',
          status: 'warning',
          summary: 'The automated math verification pass could not complete.',
          details: [message],
        },
      ],
      metrics: {
        sessionsChecked: 0,
        currentConfigSessions: 0,
        staleConfigSessions: 0,
        normGroupsChecked: 0,
      },
    }
  }
}
