import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'
import {
  mean,
  sampleSD,
  percentileLinear,
  cronbachAlpha,
  correctedItemTotalR,
  buildDimensionMatrix,
  cronbachAlphaCI95,
  standardErrorOfMeasurement,
  ceilingFloorEffect,
  welchTTest,
} from '@/utils/stats/engine'

type AdminClient = RouteAuthSuccess['adminClient']

export type ItemAnalytics = {
  questionId: string
  questionKey: string
  text: string
  dimension: string | null
  distribution: Record<string, number>
  mean: number
  sd: number | null
  /** Corrected item-total correlation (rest-score method). Null when n < 3 or item not in a multi-item dimension. */
  citc: number | null
  flag: 'review_needed' | 'potential_redundancy' | null
  ceiling: boolean
  floor: boolean
  ceilingPct: number
  floorPct: number
}

export type DimensionReliability = {
  dimension: string
  /** Cronbach's alpha. Null when fewer than 2 items or 2 respondents. */
  alpha: number | null
  /** 95% CI for Cronbach's alpha (Feldt 1965). Null when insufficient data. */
  alphaCI95: { lower: number; upper: number } | null
  /** Standard error of measurement. Null when alpha or SD unavailable. */
  sem: number | null
  /** Number of complete respondents used to compute alpha. */
  n: number
  signal: 'green' | 'amber' | 'red' | 'insufficient_data'
}

export async function getAdminAssessmentAnalytics(input: {
  adminClient: AdminClient
  assessmentId: string
}) {
  // ── Submission count ──────────────────────────────────────────────────────
  const { count: totalSubmissions } = await input.adminClient
    .from('assessment_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('assessment_id', input.assessmentId)

  // ── Trait aggregates ──────────────────────────────────────────────────────
  const { data: traitRows } = await input.adminClient
    .from('assessment_traits')
    .select('id, code, name')
    .eq('assessment_id', input.assessmentId)

  const traits: Array<{
    traitId: string
    code: string
    name: string
    count: number
    mean: number
    sd: number | null
    percentiles: { p25: number | null; p50: number | null; p75: number | null }
  }> = []

  if (traitRows && traitRows.length > 0) {
    for (const trait of traitRows) {
      const { data: scoreRows } = await input.adminClient
        .from('trait_scores')
        .select('raw_score, session_scores!inner(assessment_id)')
        .eq('trait_id', trait.id)
        .eq('session_scores.assessment_id', input.assessmentId)

      if (!scoreRows || scoreRows.length === 0) continue

      const scores = scoreRows.map((row) => row.raw_score as number)
      const sorted = [...scores].sort((a, b) => a - b)

      traits.push({
        traitId: trait.id,
        code: trait.code,
        name: trait.name,
        count: scores.length,
        mean: Math.round(mean(scores) * 100) / 100,
        sd: sampleSD(scores) !== null ? Math.round(sampleSD(scores)! * 100) / 100 : null,
        percentiles: {
          p25: percentileLinear(sorted, 25),
          p50: percentileLinear(sorted, 50),
          p75: percentileLinear(sorted, 75),
        },
      })
    }
  }

  // ── Classification breakdown ──────────────────────────────────────────────
  const { data: classRows } = await input.adminClient
    .from('assessment_submissions')
    .select('classification')
    .eq('assessment_id', input.assessmentId)

  const classMap = new Map<string, { label: string; count: number }>()
  for (const row of classRows ?? []) {
    const classification = row.classification as { key?: string; label?: string } | null
    if (!classification?.key) continue
    const existing = classMap.get(classification.key)
    if (existing) {
      existing.count += 1
      continue
    }
    classMap.set(classification.key, {
      label: classification.label ?? classification.key,
      count: 1,
    })
  }

  const total = totalSubmissions ?? 0
  const classificationBreakdown = Array.from(classMap.entries()).map(([key, { label, count }]) => ({
    key,
    label,
    count,
    pct: total > 0 ? Math.round((count / total) * 100) : 0,
  }))

  // ── Item-level analytics ──────────────────────────────────────────────────
  const { data: questions } = await input.adminClient
    .from('assessment_questions')
    .select('id, question_key, text, dimension, is_active')
    .eq('assessment_id', input.assessmentId)
    .eq('is_active', true)
    .order('sort_order')

  const itemAnalytics: ItemAnalytics[] = []
  const dimensionReliability: DimensionReliability[] = []

  if (questions && questions.length > 0 && total > 0) {
    const { data: submissions } = await input.adminClient
      .from('assessment_submissions')
      .select('responses')
      .eq('assessment_id', input.assessmentId)

    if (submissions && submissions.length > 0) {
      // Cast to typed response objects once
      const responseMaps = submissions.map(
        (s) => (s.responses as Record<string, number> | null) ?? {}
      )

      // ── Per-item raw scores (for mean, SD, distribution) ───────────────
      const rawScoresByQuestion = new Map<string, number[]>()
      for (const q of questions) {
        const scores: number[] = []
        for (const resp of responseMaps) {
          const val = resp[q.question_key]
          if (typeof val === 'number' && Number.isFinite(val)) scores.push(val)
        }
        rawScoresByQuestion.set(q.question_key, scores)
      }

      // ── Dimension matrices (for CITC and Cronbach's alpha) ─────────────
      // Group question keys by dimension
      const questionsByDimension = new Map<string, string[]>()
      for (const q of questions) {
        if (!q.dimension) continue
        const list = questionsByDimension.get(q.dimension) ?? []
        list.push(q.question_key)
        questionsByDimension.set(q.dimension, list)
      }

      // Build aligned matrices (only respondents who answered all items in dimension)
      const matrixByDimension = new Map<string, { matrix: number[][]; questionKeys: string[] }>()
      for (const [dimension, questionKeys] of questionsByDimension) {
        const matrix = buildDimensionMatrix(questionKeys, responseMaps)
        if (matrix) {
          matrixByDimension.set(dimension, { matrix, questionKeys })
        }
      }

      // ── CITC per question (from dimension matrix) ──────────────────────
      const citcByQuestion = new Map<string, number | null>()
      for (const [, { matrix, questionKeys }] of matrixByDimension) {
        for (let i = 0; i < questionKeys.length; i++) {
          const r = correctedItemTotalR(i, matrix)
          citcByQuestion.set(questionKeys[i]!, r)
        }
      }

      // ── Cronbach's alpha per dimension ────────────────────────────────
      for (const [dimension, { matrix, questionKeys }] of matrixByDimension) {
        if (questionKeys.length < 2) {
          dimensionReliability.push({ dimension, alpha: null, alphaCI95: null, sem: null, n: 0, signal: 'insufficient_data' })
          continue
        }
        const n = matrix[0]?.length ?? 0
        if (n < 2) {
          dimensionReliability.push({ dimension, alpha: null, alphaCI95: null, sem: null, n, signal: 'insufficient_data' })
          continue
        }

        const alpha = cronbachAlpha(matrix)
        let signal: DimensionReliability['signal'] = 'insufficient_data'
        if (alpha !== null) {
          if (alpha >= 0.7) signal = 'green'
          else if (alpha >= 0.6) signal = 'amber'
          else signal = 'red'
        }

        // Composite means per respondent (for SD used in SEM)
        const k = questionKeys.length
        const compositeMeans = Array.from({ length: n }, (_, j) =>
          matrix.reduce((sum, scores) => sum + (scores[j] ?? 0), 0) / k
        )
        const compositeSD = sampleSD(compositeMeans)

        const alphaCI95 =
          alpha !== null ? cronbachAlphaCI95(alpha, questionKeys.length, n) : null
        const sem =
          alpha !== null && compositeSD !== null
            ? Math.round(standardErrorOfMeasurement(compositeSD, alpha) * 1000) / 1000
            : null

        dimensionReliability.push({
          dimension,
          alpha: alpha !== null ? Math.round(alpha * 1000) / 1000 : null,
          alphaCI95,
          sem,
          n,
          signal,
        })
      }

      // ── Assemble item analytics ───────────────────────────────────────
      for (const q of questions) {
        const rawScores = rawScoresByQuestion.get(q.question_key) ?? []
        if (rawScores.length === 0) continue

        const itemMean = mean(rawScores)
        const itemSD = sampleSD(rawScores)

        const distribution: Record<string, number> = {}
        for (const v of rawScores) {
          const key = String(Math.round(v))
          distribution[key] = (distribution[key] ?? 0) + 1
        }

        const citc = citcByQuestion.get(q.question_key) ?? null

        let flag: ItemAnalytics['flag'] = null
        if (citc !== null) {
          if (citc < 0.2) flag = 'review_needed'
          else if (citc > 0.7) flag = 'potential_redundancy'
        }

        const { ceiling, floor, ceilingPct, floorPct } = ceilingFloorEffect(rawScores, 1, 5)

        itemAnalytics.push({
          questionId: q.id,
          questionKey: q.question_key,
          text: q.text,
          dimension: q.dimension,
          distribution,
          mean: Math.round(itemMean * 100) / 100,
          sd: itemSD !== null ? Math.round(itemSD * 100) / 100 : null,
          citc: citc !== null ? Math.round(citc * 1000) / 1000 : null,
          flag,
          ceiling,
          floor,
          ceilingPct: Math.round(ceilingPct * 1000) / 1000,
          floorPct: Math.round(floorPct * 1000) / 1000,
        })
      }
    }
  }

  return {
    ok: true as const,
    data: {
      totalSubmissions: total,
      traits,
      classificationBreakdown,
      itemAnalytics,
      dimensionReliability,
    },
  }
}

// ── Cohort comparison ─────────────────────────────────────────────────────────

export type CohortComparisonResult = {
  traitId: string
  traitName: string
  groupA: { cohortId: string; cohortName: string; n: number; mean: number; sd: number | null }
  groupB: { cohortId: string; cohortName: string; n: number; mean: number; sd: number | null }
  t: number
  df: number
  pValue: number
  cohenD: number
  meanDiff: number
  ci95: { lower: number; upper: number }
  effectSizeLabel: 'negligible' | 'small' | 'medium' | 'large'
}

function effectSizeLabel(d: number): CohortComparisonResult['effectSizeLabel'] {
  const abs = Math.abs(d)
  if (abs < 0.2) return 'negligible'
  if (abs < 0.5) return 'small'
  if (abs < 0.8) return 'medium'
  return 'large'
}

export async function getCohortComparison(input: {
  adminClient: AdminClient
  assessmentId: string
  traitId: string
  cohortAId: string
  cohortBId: string
}): Promise<{ ok: true; data: CohortComparisonResult } | { ok: false; error: string }> {
  const { adminClient, assessmentId, traitId, cohortAId, cohortBId } = input

  // Load trait name
  const { data: traitRow } = await adminClient
    .from('assessment_traits')
    .select('id, name')
    .eq('id', traitId)
    .eq('assessment_id', assessmentId)
    .maybeSingle()

  if (!traitRow) return { ok: false, error: 'trait_not_found' }

  // Load cohort names
  const { data: cohortRows } = await adminClient
    .from('assessment_cohorts')
    .select('id, name')
    .in('id', [cohortAId, cohortBId])
    .eq('assessment_id', assessmentId)

  const cohortMap = new Map((cohortRows ?? []).map((c) => [c.id, c.name as string]))
  if (!cohortMap.has(cohortAId) || !cohortMap.has(cohortBId)) {
    return { ok: false, error: 'cohort_not_found' }
  }

  // Fetch trait scores for each cohort via submission → invitation → cohort path
  async function getScoresForCohort(cohortId: string): Promise<number[]> {
    const { data } = await adminClient
      .from('trait_scores')
      .select(`
        raw_score,
        session_scores!inner(
          assessment_id,
          assessment_submissions!inner(
            assessment_invitations!inner(cohort_id)
          )
        )
      `)
      .eq('trait_id', traitId)
      .eq('session_scores.assessment_id', assessmentId)
      .eq('session_scores.assessment_submissions.assessment_invitations.cohort_id', cohortId)

    return (data ?? []).map((r) => r.raw_score as number)
  }

  const [scoresA, scoresB] = await Promise.all([
    getScoresForCohort(cohortAId),
    getScoresForCohort(cohortBId),
  ])

  if (scoresA.length < 2) return { ok: false, error: 'insufficient_data_group_a' }
  if (scoresB.length < 2) return { ok: false, error: 'insufficient_data_group_b' }

  const result = welchTTest(scoresA, scoresB)
  if (!result) return { ok: false, error: 'ttest_failed' }

  return {
    ok: true,
    data: {
      traitId,
      traitName: traitRow.name,
      groupA: {
        cohortId: cohortAId,
        cohortName: cohortMap.get(cohortAId)!,
        n: scoresA.length,
        mean: Math.round(mean(scoresA) * 100) / 100,
        sd: sampleSD(scoresA) !== null ? Math.round(sampleSD(scoresA)! * 100) / 100 : null,
      },
      groupB: {
        cohortId: cohortBId,
        cohortName: cohortMap.get(cohortBId)!,
        n: scoresB.length,
        mean: Math.round(mean(scoresB) * 100) / 100,
        sd: sampleSD(scoresB) !== null ? Math.round(sampleSD(scoresB)! * 100) / 100 : null,
      },
      t: Math.round(result.t * 1000) / 1000,
      df: Math.round(result.df * 10) / 10,
      pValue: Math.round(result.pValue * 10000) / 10000,
      cohenD: Math.round(result.cohenD * 1000) / 1000,
      meanDiff: Math.round(result.meanDiff * 1000) / 1000,
      ci95: {
        lower: Math.round(result.ci95.lower * 1000) / 1000,
        upper: Math.round(result.ci95.upper * 1000) / 1000,
      },
      effectSizeLabel: effectSizeLabel(result.cohenD),
    },
  }
}
