import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'
import { mean, sampleSD, percentileLinear, normCdf, cronbachAlpha } from '@/utils/stats/engine'

type AdminClient = RouteAuthSuccess['adminClient']

export async function computeNormsFromSubmissions(input: {
  adminClient: AdminClient
  assessmentId: string
  normGroupId: string
}): Promise<
  | { ok: true; data: { traitsComputed: number; n: number } }
  | { ok: false; error: string }
> {
  // Verify norm group belongs to assessment
  const { data: normGroup, error: ngError } = await input.adminClient
    .from('norm_groups')
    .select('id')
    .eq('id', input.normGroupId)
    .eq('assessment_id', input.assessmentId)
    .maybeSingle()

  if (ngError || !normGroup) {
    return { ok: false, error: 'norm_group_not_found' }
  }

  // Fetch traits for this assessment
  const { data: traits, error: traitError } = await input.adminClient
    .from('assessment_traits')
    .select(`
      id, code, score_method,
      trait_question_mappings(
        weight, reverse_scored,
        assessment_questions(question_key)
      )
    `)
    .eq('assessment_id', input.assessmentId)

  if (traitError) {
    return { ok: false, error: 'traits_fetch_failed' }
  }

  if (!traits || traits.length === 0) {
    return { ok: true, data: { traitsComputed: 0, n: 0 } }
  }

  // Fetch all session_scores for this assessment
  const { data: sessions, error: sessionError } = await input.adminClient
    .from('session_scores')
    .select('id')
    .eq('assessment_id', input.assessmentId)
    .eq('status', 'ok')

  if (sessionError) {
    return { ok: false, error: 'sessions_fetch_failed' }
  }

  const sessionIds = (sessions ?? []).map((s) => s.id)
  if (sessionIds.length === 0) {
    return { ok: true, data: { traitsComputed: 0, n: 0 } }
  }

  // Fetch all submission responses once for alpha computation
  const { data: submissionRows } = await input.adminClient
    .from('assessment_submissions')
    .select('responses')
    .eq('assessment_id', input.assessmentId)

  const responseMaps: Array<Record<string, number>> = (submissionRows ?? []).map(
    (s) => (s.responses as Record<string, number> | null) ?? {}
  )

  let traitsComputed = 0
  const computedAt = new Date().toISOString()

  for (const trait of traits) {
    const { data: scoreRows, error: scoreError } = await input.adminClient
      .from('trait_scores')
      .select('raw_score')
      .in('session_score_id', sessionIds)
      .eq('trait_id', trait.id)

    if (scoreError || !scoreRows || scoreRows.length === 0) continue

    const values = scoreRows.map((r) => r.raw_score as number).filter((v) => Number.isFinite(v))
    if (values.length === 0) continue

    const sorted = [...values].sort((a, b) => a - b)
    const traitMean = mean(values)
    const traitSD = sampleSD(values)

    // Compute Cronbach's alpha from item-level responses
    // Build per-item score arrays applying reverse scoring (scale max = 5)
    type Mapping = { weight: number; reverse_scored: boolean; assessment_questions: { question_key: string } | null }
    const mappings = ((trait.trait_question_mappings ?? []) as unknown as Mapping[]).filter(
      (m) => m.assessment_questions?.question_key !== undefined
    )

    let alpha: number | null = null
    if (mappings.length >= 2) {
      const itemArrays: number[][] = mappings.map(() => [])
      for (const resp of responseMaps) {
        const row: Array<number | null> = mappings.map((m) => {
          const raw = resp[m.assessment_questions!.question_key]
          if (typeof raw !== 'number' || !Number.isFinite(raw)) return null
          return m.reverse_scored ? 6 - raw : raw
        })
        if (row.every((v) => v !== null)) {
          row.forEach((v, i) => itemArrays[i]!.push(v as number))
        }
      }
      alpha = cronbachAlpha(itemArrays)
    }

    const normStatRow = {
      norm_group_id: input.normGroupId,
      trait_id: trait.id,
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
    }

    const { error: upsertError } = await input.adminClient
      .from('norm_stats')
      .upsert(normStatRow, { onConflict: 'norm_group_id,trait_id' })

    if (!upsertError) {
      traitsComputed++
    }
  }

  // Update norm_groups.n
  await input.adminClient
    .from('norm_groups')
    .update({ n: sessionIds.length, updated_at: computedAt })
    .eq('id', input.normGroupId)

  return { ok: true, data: { traitsComputed, n: sessionIds.length } }
}

export async function reScoreSessionsForNormGroup(input: {
  adminClient: AdminClient
  normGroupId: string
}): Promise<{ ok: true; data: { sessionsUpdated: number } } | { ok: false; error: string }> {
  // Fetch norm stats for this group
  const { data: normStats, error: nsError } = await input.adminClient
    .from('norm_stats')
    .select('trait_id, mean, sd')
    .eq('norm_group_id', input.normGroupId)

  if (nsError) {
    return { ok: false, error: 'norm_stats_fetch_failed' }
  }

  if (!normStats || normStats.length === 0) {
    return { ok: true, data: { sessionsUpdated: 0 } }
  }

  // Build lookup: trait_id → norm stats
  const statByTrait = new Map<string, { mean: number; sd: number }>()
  for (const stat of normStats) {
    statByTrait.set(stat.trait_id, { mean: stat.mean, sd: stat.sd })
  }

  const traitIds = Array.from(statByTrait.keys())
  const { data: traitScores, error: tsError } = await input.adminClient
    .from('trait_scores')
    .select('id, trait_id, raw_score')
    .in('trait_id', traitIds)

  if (tsError) {
    return { ok: false, error: 'trait_scores_fetch_failed' }
  }

  if (!traitScores || traitScores.length === 0) {
    return { ok: true, data: { sessionsUpdated: 0 } }
  }

  let sessionsUpdated = 0

  for (const ts of traitScores) {
    const stats = statByTrait.get(ts.trait_id)
    if (!stats) continue

    const rawScore = ts.raw_score as number
    let zScore: number | null = null
    let percentile: number | null = null
    let band: string | null = null

    if (stats.sd > 0) {
      zScore = (rawScore - stats.mean) / stats.sd
      percentile = Math.round(normCdf(zScore) * 100)
      if (percentile >= 75) band = 'high'
      else if (percentile >= 40) band = 'mid'
      else band = 'low'
    }

    const { error: updateError } = await input.adminClient
      .from('trait_scores')
      .update({ z_score: zScore, percentile, band, computed_at: new Date().toISOString() })
      .eq('id', ts.id)

    if (!updateError) sessionsUpdated++
  }

  return { ok: true, data: { sessionsUpdated } }
}
