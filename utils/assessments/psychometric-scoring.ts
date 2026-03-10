import crypto from 'node:crypto'
import { createAdminClient } from '@/utils/supabase/admin'
import {
  loadAssessmentPsychometricStructure,
  resolveKeyedItemValue,
} from '@/utils/assessments/psychometric-structure'
import { bandFromPercentile } from '@/utils/assessments/psychometric-bands'
import { normCdf } from '@/utils/stats/engine'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

type NormStatsRow = {
  trait_id: string
  mean: number
  sd: number
}

type DimensionNormStatsRow = {
  dimension_id: string
  mean: number
  sd: number
}

function buildInputHash(value: unknown) {
  return crypto.createHash('sha1').update(JSON.stringify(value)).digest('hex')
}

export async function computeAndStorePsychometricScores(
  adminClient: AdminClient,
  submissionId: string,
  assessmentId: string,
  rawResponses: Record<string, number>
): Promise<{ ok: boolean; sessionScoreId?: string; error?: string }> {
  try {
    const structure = await loadAssessmentPsychometricStructure(adminClient, assessmentId)
    if (!structure.hasTraitScales) {
      // No traits configured — graceful skip
      return { ok: true }
    }

    const traitScales = structure.traitScales

    // 1. Compute raw scores per trait
    const traitRawScores = new Map<string, { rawScore: number; rawN: number }>()

    for (const scale of traitScales) {
      let weightedSum = 0
      let totalWeight = 0
      let answeredCount = 0

      for (const item of scale.items) {
        const value = resolveKeyedItemValue(item, rawResponses)
        if (value === null) continue

        weightedSum += value * item.weight
        totalWeight += item.weight
        answeredCount++
      }

      if (answeredCount === 0 || totalWeight === 0) continue

      const rawScore = weightedSum / totalWeight

      if (scale.traitId) {
        traitRawScores.set(scale.traitId, { rawScore, rawN: answeredCount })
      }
    }

    if (traitRawScores.size === 0) {
      return { ok: true }
    }

    // 2. Load global norm group + norm stats
    const { data: normGroupRow } = await adminClient
      .from('norm_groups')
      .select('id')
      .eq('assessment_id', assessmentId)
      .eq('is_global', true)
      .maybeSingle()

    const normGroupId: string | null = normGroupRow?.id ?? null
    const normStatsMap = new Map<string, NormStatsRow>()
    const dimensionNormStatsMap = new Map<string, DimensionNormStatsRow>()

    if (normGroupId) {
      const [normStatsResult, dimensionNormStatsResult] = await Promise.all([
        adminClient
          .from('norm_stats')
          .select('trait_id, mean, sd')
          .eq('norm_group_id', normGroupId),
        adminClient
          .from('dimension_norm_stats')
          .select('dimension_id, mean, sd')
          .eq('norm_group_id', normGroupId),
      ])

      if (normStatsResult.data) {
        for (const row of normStatsResult.data as NormStatsRow[]) {
          normStatsMap.set(row.trait_id, row)
        }
      }

      if (dimensionNormStatsResult.data) {
        for (const row of dimensionNormStatsResult.data as DimensionNormStatsRow[]) {
          dimensionNormStatsMap.set(row.dimension_id, row)
        }
      }
    }

    // 3. Create session_scores record
    const { data: sessionRow, error: sessionError } = await adminClient
      .from('session_scores')
      .insert({
        submission_id: submissionId,
        assessment_id: assessmentId,
        norm_group_id: normGroupId,
        engine_type: 'psychometric',
        engine_version: 2,
        input_hash: buildInputHash({
          assessmentId,
          scales: traitScales.map((scale) => ({
            key: scale.key,
            items: scale.items.map((item) => ({
              questionKey: item.questionKey,
              weight: item.weight,
              reverseScored: item.reverseScored,
            })),
          })),
        }),
        status: 'ok',
        warnings: structure.warnings.length > 0 ? structure.warnings : null,
      })
      .select('id')
      .single()

    if (sessionError || !sessionRow?.id) {
      return { ok: false, error: 'session_score_insert_failed' }
    }

    const sessionScoreId = sessionRow.id

    // 4. Build and insert trait_scores
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
        band: bandFromPercentile(percentile),
      })
    }

    if (traitScoreInserts.length > 0) {
      await adminClient.from('trait_scores').insert(traitScoreInserts)
    }

    // 5. Compute dimension_scores (mean of child trait raw_scores)
    const dimensionMap = new Map<string, number[]>()

    for (const scale of traitScales) {
      if (!scale.dimensionId || !scale.traitId) continue
      const scores = traitRawScores.get(scale.traitId)
      if (!scores) continue
      if (!dimensionMap.has(scale.dimensionId)) {
        dimensionMap.set(scale.dimensionId, [])
      }
      dimensionMap.get(scale.dimensionId)!.push(scores.rawScore)
    }

    const dimensionScoreInserts: Array<{
      session_score_id: string
      dimension_id: string
      raw_score: number
      z_score: number | null
      percentile: number | null
      band: string | null
    }> = []

    for (const [dimensionId, scores] of dimensionMap) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      const normStats = dimensionNormStatsMap.get(dimensionId)
      let zScore: number | null = null
      let percentile: number | null = null

      if (normStats && normStats.sd > 0) {
        zScore = (avg - normStats.mean) / normStats.sd
        percentile = Math.round(normCdf(zScore) * 100)
      }

      dimensionScoreInserts.push({
        session_score_id: sessionScoreId,
        dimension_id: dimensionId,
        raw_score: avg,
        z_score: zScore,
        percentile,
        band: bandFromPercentile(percentile),
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
