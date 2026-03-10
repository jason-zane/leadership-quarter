import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'
import { resolveNormGroupSubmissionIds } from '@/utils/assessments/norm-group-filters'
import {
  buildScaleMatrix,
  loadAssessmentPsychometricStructure,
} from '@/utils/assessments/psychometric-structure'
import { bandFromPercentile } from '@/utils/assessments/psychometric-bands'
import { cronbachAlpha, mean, normCdf, percentileLinear, sampleSD } from '@/utils/stats/engine'

type AdminClient = RouteAuthSuccess['adminClient']

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

async function loadNormGroup(
  adminClient: AdminClient,
  assessmentId: string,
  normGroupId: string
) {
  return adminClient
    .from('norm_groups')
    .select('id, assessment_id, filters, is_global')
    .eq('id', normGroupId)
    .eq('assessment_id', assessmentId)
    .maybeSingle()
}

export async function computeNormsFromSubmissions(input: {
  adminClient: AdminClient
  assessmentId: string
  normGroupId: string
}): Promise<
  | { ok: true; data: { traitsComputed: number; dimensionsComputed: number; n: number } }
  | { ok: false; error: string }
> {
  const { data: normGroup, error: normGroupError } = await loadNormGroup(
    input.adminClient,
    input.assessmentId,
    input.normGroupId
  )

  if (normGroupError || !normGroup) {
    return { ok: false, error: 'norm_group_not_found' }
  }

  // Check assessment is not archived
  const { data: assessmentRow } = await input.adminClient
    .from('assessments')
    .select('status')
    .eq('id', input.assessmentId)
    .maybeSingle()

  if (assessmentRow?.status === 'archived') {
    return { ok: false, error: 'assessment_archived' as const }
  }

  const structure = await loadAssessmentPsychometricStructure(input.adminClient, input.assessmentId)
  if (!structure.hasTraitScales) {
    return { ok: true, data: { traitsComputed: 0, dimensionsComputed: 0, n: 0 } }
  }

  const submissionMatchResult = await resolveNormGroupSubmissionIds({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
    filters: normGroup.filters as Record<string, unknown> | null | undefined,
  })

  if (!submissionMatchResult.ok) {
    return { ok: false, error: submissionMatchResult.error }
  }

  const matchedSubmissionIds = submissionMatchResult.data.submissionIds
  if (matchedSubmissionIds.length === 0) {
    await input.adminClient
      .from('norm_groups')
      .update({ n: 0, updated_at: new Date().toISOString() })
      .eq('id', input.normGroupId)
    return { ok: true, data: { traitsComputed: 0, dimensionsComputed: 0, n: 0 } }
  }

  const [sessionsResult, submissionsResult] = await Promise.all([
    input.adminClient
      .from('session_scores')
      .select('id, submission_id')
      .eq('assessment_id', input.assessmentId)
      .eq('status', 'ok')
      .in('submission_id', matchedSubmissionIds),
    input.adminClient
      .from('assessment_submissions')
      .select('id, responses')
      .eq('assessment_id', input.assessmentId)
      .in('id', matchedSubmissionIds),
  ])

  if (sessionsResult.error) {
    return { ok: false, error: 'sessions_fetch_failed' }
  }

  const sessionIds = (sessionsResult.data ?? []).map((session) => session.id as string)
  if (sessionIds.length === 0) {
    return { ok: true, data: { traitsComputed: 0, dimensionsComputed: 0, n: 0 } }
  }

  const responseMaps: Array<Record<string, number>> = (submissionsResult.data ?? []).map(
    (submission) => (submission.responses as Record<string, number> | null) ?? {}
  )

  const [traitScoresResult, dimensionScoresResult] = await Promise.all([
    input.adminClient
      .from('trait_scores')
      .select('session_score_id, trait_id, raw_score')
      .in('session_score_id', sessionIds),
    input.adminClient
      .from('dimension_scores')
      .select('session_score_id, dimension_id, raw_score')
      .in('session_score_id', sessionIds),
  ])

  if (traitScoresResult.error) {
    return { ok: false, error: 'trait_scores_fetch_failed' }
  }

  if (dimensionScoresResult.error) {
    return { ok: false, error: 'dimension_scores_fetch_failed' }
  }

  const traitScoresByTrait = new Map<string, number[]>()
  for (const row of (traitScoresResult.data ?? []) as TraitScoreRow[]) {
    const list = traitScoresByTrait.get(row.trait_id) ?? []
    list.push(Number(row.raw_score))
    traitScoresByTrait.set(row.trait_id, list)
  }

  const dimensionScoresByDimension = new Map<string, number[]>()
  for (const row of (dimensionScoresResult.data ?? []) as DimensionScoreRow[]) {
    const list = dimensionScoresByDimension.get(row.dimension_id) ?? []
    list.push(Number(row.raw_score))
    dimensionScoresByDimension.set(row.dimension_id, list)
  }

  const computedAt = new Date().toISOString()
  let traitsComputed = 0
  let dimensionsComputed = 0

  for (const scale of structure.traitScales) {
    if (!scale.traitId) continue
    const values = traitScoresByTrait.get(scale.traitId) ?? []
    if (values.length === 0) continue

    const sorted = [...values].sort((a, b) => a - b)
    const traitMean = mean(values)
    const traitSD = sampleSD(values)
    const itemMatrix = buildScaleMatrix(scale, responseMaps)
    const alpha = itemMatrix ? cronbachAlpha(itemMatrix) : null

    const { error: upsertError } = await input.adminClient
      .from('norm_stats')
      .upsert(
        {
          norm_group_id: input.normGroupId,
          trait_id: scale.traitId,
          mean: Math.round(traitMean * 10000) / 10000,
          sd: Math.round((traitSD ?? 0) * 10000) / 10000,
          p10: percentileLinear(sorted, 10),
          p25: percentileLinear(sorted, 25),
          p50: percentileLinear(sorted, 50),
          p75: percentileLinear(sorted, 75),
          p90: percentileLinear(sorted, 90),
          min: sorted[0] ?? null,
          max: sorted[sorted.length - 1] ?? null,
          alpha: alpha !== null ? Math.round(alpha * 10000) / 10000 : null,
          computed_at: computedAt,
        },
        { onConflict: 'norm_group_id,trait_id' }
      )

    if (!upsertError) {
      traitsComputed++
    }
  }

  const seenDimensions = new Set<string>()
  for (const scale of structure.traitScales) {
    if (!scale.dimensionId || seenDimensions.has(scale.dimensionId)) continue
    seenDimensions.add(scale.dimensionId)

    const values = dimensionScoresByDimension.get(scale.dimensionId) ?? []
    if (values.length === 0) continue

    const sorted = [...values].sort((a, b) => a - b)
    const dimensionMean = mean(values)
    const dimensionSD = sampleSD(values)

    const { error: upsertError } = await input.adminClient
      .from('dimension_norm_stats')
      .upsert(
        {
          norm_group_id: input.normGroupId,
          dimension_id: scale.dimensionId,
          mean: Math.round(dimensionMean * 10000) / 10000,
          sd: Math.round((dimensionSD ?? 0) * 10000) / 10000,
          p10: percentileLinear(sorted, 10),
          p25: percentileLinear(sorted, 25),
          p50: percentileLinear(sorted, 50),
          p75: percentileLinear(sorted, 75),
          p90: percentileLinear(sorted, 90),
          min: sorted[0] ?? null,
          max: sorted[sorted.length - 1] ?? null,
          computed_at: computedAt,
        },
        { onConflict: 'norm_group_id,dimension_id' }
      )

    if (!upsertError) {
      dimensionsComputed++
    }
  }

  await input.adminClient
    .from('norm_groups')
    .update({ n: sessionIds.length, updated_at: computedAt })
    .eq('id', input.normGroupId)

  return {
    ok: true,
    data: {
      traitsComputed,
      dimensionsComputed,
      n: sessionIds.length,
    },
  }
}

export async function reScoreSessionsForNormGroup(input: {
  adminClient: AdminClient
  normGroupId: string
}): Promise<
  | { ok: true; data: { sessionsUpdated: number; traitScoresUpdated: number; dimensionScoresUpdated: number } }
  | { ok: false; error: string }
> {
  const { data: normGroup, error: normGroupError } = await input.adminClient
    .from('norm_groups')
    .select('id, assessment_id, filters')
    .eq('id', input.normGroupId)
    .maybeSingle()

  if (normGroupError || !normGroup) {
    return { ok: false, error: 'norm_group_not_found' }
  }

  // Check assessment is not archived
  const { data: assessmentRowForRescore } = await input.adminClient
    .from('assessments')
    .select('status')
    .eq('id', normGroup.assessment_id as string)
    .maybeSingle()

  if (assessmentRowForRescore?.status === 'archived') {
    return { ok: false, error: 'assessment_archived' as const }
  }

  const submissionMatchResult = await resolveNormGroupSubmissionIds({
    adminClient: input.adminClient,
    assessmentId: normGroup.assessment_id as string,
    filters: normGroup.filters as Record<string, unknown> | null | undefined,
  })

  if (!submissionMatchResult.ok) {
    return { ok: false, error: submissionMatchResult.error }
  }

  const submissionIds = submissionMatchResult.data.submissionIds
  if (submissionIds.length === 0) {
    return { ok: true, data: { sessionsUpdated: 0, traitScoresUpdated: 0, dimensionScoresUpdated: 0 } }
  }

  const [sessionsResult, normStatsResult, dimensionNormStatsResult] = await Promise.all([
    input.adminClient
      .from('session_scores')
      .select('id, submission_id')
      .eq('assessment_id', normGroup.assessment_id as string)
      .eq('status', 'ok')
      .in('submission_id', submissionIds),
    input.adminClient
      .from('norm_stats')
      .select('trait_id, mean, sd')
      .eq('norm_group_id', input.normGroupId),
    input.adminClient
      .from('dimension_norm_stats')
      .select('dimension_id, mean, sd')
      .eq('norm_group_id', input.normGroupId),
  ])

  if (sessionsResult.error) {
    return { ok: false, error: 'sessions_fetch_failed' }
  }
  if (normStatsResult.error) {
    return { ok: false, error: 'norm_stats_fetch_failed' }
  }
  if (dimensionNormStatsResult.error) {
    return { ok: false, error: 'dimension_norm_stats_fetch_failed' }
  }

  const sessions = (sessionsResult.data ?? []) as Array<{ id: string; submission_id: string }>
  if (sessions.length === 0) {
    return { ok: true, data: { sessionsUpdated: 0, traitScoresUpdated: 0, dimensionScoresUpdated: 0 } }
  }

  const sessionIds = sessions.map((session) => session.id)
  const statByTrait = new Map(
    (normStatsResult.data ?? []).map((stat) => [
      stat.trait_id as string,
      { mean: Number(stat.mean), sd: Number(stat.sd) },
    ])
  )
  const statByDimension = new Map(
    (dimensionNormStatsResult.data ?? []).map((stat) => [
      stat.dimension_id as string,
      { mean: Number(stat.mean), sd: Number(stat.sd) },
    ])
  )

  await input.adminClient
    .from('session_scores')
    .update({
      norm_group_id: input.normGroupId,
      updated_at: new Date().toISOString(),
    })
    .in('id', sessionIds)

  const [traitScoresResult, dimensionScoresResult] = await Promise.all([
    input.adminClient
      .from('trait_scores')
      .select('id, trait_id, raw_score')
      .in('session_score_id', sessionIds),
    input.adminClient
      .from('dimension_scores')
      .select('id, dimension_id, raw_score')
      .in('session_score_id', sessionIds),
  ])

  if (traitScoresResult.error) {
    return { ok: false, error: 'trait_scores_fetch_failed' }
  }
  if (dimensionScoresResult.error) {
    return { ok: false, error: 'dimension_scores_fetch_failed' }
  }

  let traitScoresUpdated = 0
  for (const score of traitScoresResult.data ?? []) {
    const stats = statByTrait.get(score.trait_id as string)
    if (!stats) continue

    const rawScore = Number(score.raw_score)
    const zScore = stats.sd > 0 ? (rawScore - stats.mean) / stats.sd : null
    const percentile = zScore !== null ? Math.round(normCdf(zScore) * 100) : null

    const { error } = await input.adminClient
      .from('trait_scores')
      .update({
        z_score: zScore,
        percentile,
        band: bandFromPercentile(percentile),
        computed_at: new Date().toISOString(),
      })
      .eq('id', score.id as string)

    if (!error) {
      traitScoresUpdated++
    }
  }

  let dimensionScoresUpdated = 0
  for (const score of dimensionScoresResult.data ?? []) {
    const stats = statByDimension.get(score.dimension_id as string)
    if (!stats) continue

    const rawScore = Number(score.raw_score)
    const zScore = stats.sd > 0 ? (rawScore - stats.mean) / stats.sd : null
    const percentile = zScore !== null ? Math.round(normCdf(zScore) * 100) : null

    const { error } = await input.adminClient
      .from('dimension_scores')
      .update({
        z_score: zScore,
        percentile,
        band: bandFromPercentile(percentile),
        computed_at: new Date().toISOString(),
      })
      .eq('id', score.id as string)

    if (!error) {
      dimensionScoresUpdated++
    }
  }

  return {
    ok: true,
    data: {
      sessionsUpdated: sessionIds.length,
      traitScoresUpdated,
      dimensionScoresUpdated,
    },
  }
}
