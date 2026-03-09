import { createAdminClient } from '@/utils/supabase/admin'
import { normCdf } from '@/utils/stats/engine'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

type TraitRow = {
  id: string
  code: string
  dimension_id: string | null
  score_method: string
  trait_question_mappings: Array<{
    question_id: string
    weight: number
    reverse_scored: boolean
    assessment_questions: { question_key: string } | null
  }>
}

type NormStatsRow = {
  trait_id: string
  mean: number
  sd: number
}

export async function computeAndStorePsychometricScores(
  adminClient: AdminClient,
  submissionId: string,
  assessmentId: string,
  rawResponses: Record<string, number>
): Promise<{ ok: boolean; sessionScoreId?: string; error?: string }> {
  try {
    // 1. Load traits + question mappings
    const { data: traitRows, error: traitError } = await adminClient
      .from('assessment_traits')
      .select(`
        id, code, dimension_id, score_method,
        trait_question_mappings(
          question_id, weight, reverse_scored,
          assessment_questions(question_key)
        )
      `)
      .eq('assessment_id', assessmentId)

    if (traitError || !traitRows || traitRows.length === 0) {
      // No traits configured — graceful skip
      return { ok: true }
    }

    const traits = traitRows as unknown as TraitRow[]

    // 2. Compute raw scores per trait
    const traitRawScores = new Map<string, { rawScore: number; rawN: number }>()

    for (const trait of traits) {
      const mappings = trait.trait_question_mappings ?? []
      const validMappings = mappings.filter(
        (m) => m.assessment_questions?.question_key !== undefined
      )

      if (validMappings.length === 0) continue

      let weightedSum = 0
      let totalWeight = 0
      let answeredCount = 0

      for (const mapping of validMappings) {
        const key = mapping.assessment_questions!.question_key
        const raw = rawResponses[key]
        if (raw === undefined || raw === null) continue

        const value = mapping.reverse_scored ? 6 - raw : raw
        weightedSum += value * mapping.weight
        totalWeight += mapping.weight
        answeredCount++
      }

      if (answeredCount === 0 || totalWeight === 0) continue

      const rawScore =
        trait.score_method === 'sum' ? weightedSum : weightedSum / totalWeight

      traitRawScores.set(trait.id, { rawScore, rawN: answeredCount })
    }

    if (traitRawScores.size === 0) {
      return { ok: true }
    }

    // 3. Load global norm group + norm stats
    const { data: normGroupRow } = await adminClient
      .from('norm_groups')
      .select('id')
      .eq('assessment_id', assessmentId)
      .eq('is_global', true)
      .maybeSingle()

    const normGroupId: string | null = normGroupRow?.id ?? null
    const normStatsMap = new Map<string, NormStatsRow>()

    if (normGroupId) {
      const { data: normStatsRows } = await adminClient
        .from('norm_stats')
        .select('trait_id, mean, sd')
        .eq('norm_group_id', normGroupId)

      if (normStatsRows) {
        for (const row of normStatsRows as NormStatsRow[]) {
          normStatsMap.set(row.trait_id, row)
        }
      }
    }

    // 4. Create session_scores record
    const { data: sessionRow, error: sessionError } = await adminClient
      .from('session_scores')
      .insert({
        submission_id: submissionId,
        assessment_id: assessmentId,
        norm_group_id: normGroupId,
        status: 'ok',
      })
      .select('id')
      .single()

    if (sessionError || !sessionRow?.id) {
      return { ok: false, error: 'session_score_insert_failed' }
    }

    const sessionScoreId = sessionRow.id

    // 5. Build and insert trait_scores
    const traitScoreInserts: Array<{
      session_score_id: string
      trait_id: string
      raw_score: number
      raw_n: number
      z_score: number | null
      percentile: number | null
      band: string | null
    }> = []

    for (const [traitId, { rawScore, rawN }] of traitRawScores) {
      const normStats = normStatsMap.get(traitId)
      let zScore: number | null = null
      let percentile: number | null = null

      if (normStats && normStats.sd > 0) {
        zScore = (rawScore - normStats.mean) / normStats.sd
        percentile = Math.round(normCdf(zScore) * 100)
      }

      traitScoreInserts.push({
        session_score_id: sessionScoreId,
        trait_id: traitId,
        raw_score: rawScore,
        raw_n: rawN,
        z_score: zScore,
        percentile,
        band: null,
      })
    }

    if (traitScoreInserts.length > 0) {
      await adminClient.from('trait_scores').insert(traitScoreInserts)
    }

    // 6. Compute dimension_scores (mean of child trait raw_scores)
    const dimensionMap = new Map<string, number[]>()

    for (const trait of traits) {
      if (!trait.dimension_id) continue
      const scores = traitRawScores.get(trait.id)
      if (!scores) continue
      if (!dimensionMap.has(trait.dimension_id)) {
        dimensionMap.set(trait.dimension_id, [])
      }
      dimensionMap.get(trait.dimension_id)!.push(scores.rawScore)
    }

    const dimensionScoreInserts: Array<{
      session_score_id: string
      dimension_id: string
      raw_score: number
      z_score: null
      percentile: null
      band: null
    }> = []

    for (const [dimensionId, scores] of dimensionMap) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      dimensionScoreInserts.push({
        session_score_id: sessionScoreId,
        dimension_id: dimensionId,
        raw_score: avg,
        z_score: null,
        percentile: null,
        band: null,
      })
    }

    if (dimensionScoreInserts.length > 0) {
      await adminClient.from('dimension_scores').insert(dimensionScoreInserts)
    }

    return { ok: true, sessionScoreId }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
