import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'
import {
  alphaIfItemDeleted,
  ceilingFloorEffect,
  correctedItemTotalR,
  cronbachAlpha,
  cronbachAlphaCI95,
  mean,
  percentileLinear,
  sampleSD,
  standardErrorOfMeasurement,
  welchTTest,
} from '@/utils/stats/engine'
import {
  buildScaleItemValueMap,
  buildScaleMatrix,
  countScaleItemMissing,
  loadAssessmentPsychometricStructure,
  type PsychometricStructureWarning,
} from '@/utils/assessments/psychometric-structure'

type AdminClient = RouteAuthSuccess['adminClient']

export type ItemAnalytics = {
  questionId: string
  questionKey: string
  text: string
  dimension: string | null
  source: 'trait_mapped' | 'legacy_dimension'
  reverseScored: boolean
  distribution: Record<string, number>
  mean: number
  sd: number | null
  /** Corrected item-total correlation (rest-score method). Null when n < 3 or item not in a multi-item dimension. */
  citc: number | null
  alphaIfDeleted: number | null
  flag: 'review_needed' | 'potential_redundancy' | null
  ceiling: boolean
  floor: boolean
  ceilingPct: number
  floorPct: number
  missingPct: number
  healthSignal: 'green' | 'amber' | 'red'
  /** Classical difficulty: (mean - 1) / (scalePoints - 1). Range [0,1]. Ideal 0.30–0.70. */
  pValue: number | null
  /** Upper-lower 27% discrimination index. Ideal >= 0.30. */
  discriminationIndex: number | null
}

export type DimensionReliability = {
  dimension: string
  scaleKey: string
  source: 'trait_mapped' | 'legacy_dimension'
  itemCount: number
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

export type ConstructWarning = PsychometricStructureWarning

function itemHealthSignal(item: {
  citc: number | null
  missingPct: number | null
  ceilingPct: number
  floorPct: number
}): 'green' | 'amber' | 'red' {
  if (item.citc !== null && item.citc < 0.2) return 'red'
  if (item.missingPct !== null && item.missingPct >= 0.15) return 'red'
  if (item.citc !== null && item.citc < 0.3) return 'amber'
  if (item.missingPct !== null && item.missingPct >= 0.05) return 'amber'
  if (item.ceilingPct >= 0.5) return 'amber'
  if (item.floorPct >= 0.5) return 'amber'
  return 'green'
}

export async function getAdminAssessmentAnalytics(input: {
  adminClient: AdminClient
  assessmentId: string
}) {
  const [
    { count: allSubmissions },
    { count: excludedSubmissions },
    { data: traitRows },
    { data: submissionRows },
  ] = await Promise.all([
    input.adminClient
      .from('assessment_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('assessment_id', input.assessmentId)
      .eq('is_preview_sample', false),
    input.adminClient
      .from('assessment_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('assessment_id', input.assessmentId)
      .eq('is_preview_sample', false)
      .eq('excluded_from_analysis', true),
    input.adminClient
      .from('assessment_traits')
      .select('id, code, name')
      .eq('assessment_id', input.assessmentId),
    input.adminClient
      .from('assessment_submissions')
      .select('id, classification, responses')
      .eq('assessment_id', input.assessmentId)
      .eq('is_preview_sample', false)
      .eq('excluded_from_analysis', false),
  ])

  const activeSubmissions = (submissionRows ?? []) as Array<{
    id: string
    classification: { key?: string; label?: string } | null
    responses: Record<string, number> | null
  }>
  const analysisSubmissionIds = activeSubmissions.map((submission) => submission.id)
  const totalSubmissions = analysisSubmissionIds.length

  const traits: Array<{
    traitId: string
    code: string
    name: string
    count: number
    mean: number
    sd: number | null
    percentiles: { p25: number | null; p50: number | null; p75: number | null }
  }> = []

  if (traitRows && traitRows.length > 0 && analysisSubmissionIds.length > 0) {
    const { data: sessionRows } = await input.adminClient
      .from('session_scores')
      .select('id')
      .eq('assessment_id', input.assessmentId)
      .eq('status', 'ok')
      .in('submission_id', analysisSubmissionIds)

    const sessionIds = (sessionRows ?? []).map((row) => row.id as string)
    let rawTraitRows: Array<{ trait_id: string; raw_score: number }> = []

    if (sessionIds.length > 0) {
      const { data: traitScoreRows } = await input.adminClient
        .from('trait_scores')
        .select('trait_id, raw_score')
        .in('session_score_id', sessionIds)

      rawTraitRows = (traitScoreRows ?? []) as Array<{ trait_id: string; raw_score: number }>
    }

    const scoresByTrait = new Map<string, number[]>()
    for (const row of rawTraitRows) {
      const scores = scoresByTrait.get(row.trait_id) ?? []
      scores.push(Number(row.raw_score))
      scoresByTrait.set(row.trait_id, scores)
    }

    for (const trait of traitRows) {
      const scores = scoresByTrait.get(trait.id) ?? []
      if (scores.length === 0) continue
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
  const classMap = new Map<string, { label: string; count: number }>()
  for (const row of activeSubmissions) {
    const classification = row.classification
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

  const total = totalSubmissions
  const classificationBreakdown = Array.from(classMap.entries()).map(([key, { label, count }]) => ({
    key,
    label,
    count,
    pct: total > 0 ? Math.round((count / total) * 100) : 0,
  }))

  const itemAnalytics: ItemAnalytics[] = []
  const dimensionReliability: DimensionReliability[] = []
  const constructWarnings: ConstructWarning[] = []

  if (total > 0) {
    if (activeSubmissions.length > 0) {
      const structure = await loadAssessmentPsychometricStructure(
        input.adminClient,
        input.assessmentId
      )
      constructWarnings.push(...structure.warnings)

      const responseMaps = activeSubmissions.map(
        (submission) => submission.responses ?? {}
      )

      for (const scale of structure.primaryScales) {
        const valuesByQuestion = buildScaleItemValueMap(scale, responseMaps)
        const missingByQuestion = countScaleItemMissing(scale, responseMaps)
        const matrix = buildScaleMatrix(scale, responseMaps)

        const citcByQuestion = new Map<string, number | null>()
        const alphaIfDeletedByQuestion = new Map<string, number | null>()

        if (matrix) {
          for (let index = 0; index < scale.items.length; index++) {
            const questionKey = scale.items[index]?.questionKey
            if (!questionKey) continue
            citcByQuestion.set(questionKey, correctedItemTotalR(index, matrix))
            alphaIfDeletedByQuestion.set(questionKey, alphaIfItemDeleted(index, matrix))
          }
        }

        // Pre-compute respondent sort order by total scale score for correct discrimination index
        let respondentSortedByTotal: number[] | null = null
        if (matrix && matrix[0] && matrix[0].length >= 6) {
          const nRespondents = matrix[0].length
          const totalScores = Array.from({ length: nRespondents }, (_, j) =>
            matrix.reduce((sum, itemScores) => sum + (itemScores[j] ?? 0), 0)
          )
          respondentSortedByTotal = Array.from({ length: nRespondents }, (_, i) => i)
            .sort((a, b) => totalScores[a]! - totalScores[b]!)
        }

        if (scale.items.length < 2) {
          dimensionReliability.push({
            dimension: scale.label,
            scaleKey: scale.key,
            source: scale.source,
            itemCount: scale.items.length,
            alpha: null,
            alphaCI95: null,
            sem: null,
            n: 0,
            signal: 'insufficient_data',
          })
        } else {
          const n = matrix?.[0]?.length ?? 0
          const alpha = matrix ? cronbachAlpha(matrix) : null
          let signal: DimensionReliability['signal'] = 'insufficient_data'
          if (alpha !== null) {
            if (alpha >= 0.7) signal = 'green'
            else if (alpha >= 0.6) signal = 'amber'
            else signal = 'red'
          }

          const compositeMeans =
            matrix && n > 0
              ? Array.from({ length: n }, (_, index) =>
                  matrix.reduce((sum, scores) => sum + (scores[index] ?? 0), 0) / scale.items.length
                )
              : []
          const compositeSD = sampleSD(compositeMeans)

          dimensionReliability.push({
            dimension: scale.label,
            scaleKey: scale.key,
            source: scale.source,
            itemCount: scale.items.length,
            alpha: alpha !== null ? Math.round(alpha * 1000) / 1000 : null,
            alphaCI95:
              alpha !== null && n > 1
                ? cronbachAlphaCI95(alpha, scale.items.length, n)
                : null,
            sem:
              alpha !== null && compositeSD !== null
                ? Math.round(standardErrorOfMeasurement(compositeSD, alpha) * 1000) / 1000
                : null,
            n,
            signal,
          })
        }

        for (let itemIdx = 0; itemIdx < scale.items.length; itemIdx++) {
          const item = scale.items[itemIdx]!
          const rawScores = valuesByQuestion.get(item.questionKey) ?? []
          const itemMean = rawScores.length > 0 ? mean(rawScores) : 0
          const itemSD = sampleSD(rawScores)
          const distribution: Record<string, number> = {}

          for (const value of rawScores) {
            const key = String(Math.round(value))
            distribution[key] = (distribution[key] ?? 0) + 1
          }

          const citc = citcByQuestion.get(item.questionKey) ?? null
          let flag: ItemAnalytics['flag'] = null
          if (citc !== null) {
            if (citc < 0.2) flag = 'review_needed'
            else if (citc > 0.7) flag = 'potential_redundancy'
          }

          const { ceiling, floor, ceilingPct, floorPct } = ceilingFloorEffect(rawScores, 1, 5)
          const missingCount = missingByQuestion.get(item.questionKey) ?? 0
          const computedMissingPct = total > 0 ? Math.round((missingCount / total) * 1000) / 1000 : 0

          // p-value: (mean - minScale) / (maxScale - minScale), where scale is 1..5
          const scaleMin = 1
          const scaleMax = 5
          const pValue = rawScores.length > 0 ? Math.round(((itemMean - scaleMin) / (scaleMax - scaleMin)) * 1000) / 1000 : null

          // Discrimination index: upper vs lower 27% by total scale score (classical D-index)
          let discriminationIndex: number | null = null
          if (matrix && respondentSortedByTotal && respondentSortedByTotal.length >= 6) {
            const cutoff = Math.floor(respondentSortedByTotal.length * 0.27)
            const lowerIndices = respondentSortedByTotal.slice(0, cutoff)
            const upperIndices = respondentSortedByTotal.slice(-cutoff)
            const itemScores = matrix[itemIdx]!
            const meanLower = lowerIndices.reduce((sum, j) => sum + itemScores[j]!, 0) / lowerIndices.length
            const meanUpper = upperIndices.reduce((sum, j) => sum + itemScores[j]!, 0) / upperIndices.length
            discriminationIndex = Math.round(((meanUpper - meanLower) / (scaleMax - scaleMin)) * 1000) / 1000
          }

          itemAnalytics.push({
            questionId: item.questionId,
            questionKey: item.questionKey,
            text: item.text,
            dimension: scale.label,
            source: scale.source,
            reverseScored: item.reverseScored,
            distribution,
            mean: rawScores.length > 0 ? Math.round(itemMean * 100) / 100 : 0,
            sd: itemSD !== null ? Math.round(itemSD * 100) / 100 : null,
            citc: citc !== null ? Math.round(citc * 1000) / 1000 : null,
            alphaIfDeleted:
              alphaIfDeletedByQuestion.get(item.questionKey) !== null &&
              alphaIfDeletedByQuestion.get(item.questionKey) !== undefined
                ? Math.round((alphaIfDeletedByQuestion.get(item.questionKey) ?? 0) * 1000) / 1000
                : null,
            flag,
            ceiling,
            floor,
            ceilingPct: Math.round(ceilingPct * 1000) / 1000,
            floorPct: Math.round(floorPct * 1000) / 1000,
            missingPct: computedMissingPct,
            healthSignal: itemHealthSignal({ citc, missingPct: total > 0 ? missingCount / total : 0, ceilingPct, floorPct }),
            pValue,
            discriminationIndex,
          })
        }
      }
    }
  }

  itemAnalytics.sort((a, b) => a.questionKey.localeCompare(b.questionKey))

  return {
    ok: true as const,
    data: {
      allSubmissions: allSubmissions ?? totalSubmissions,
      excludedSubmissions: excludedSubmissions ?? 0,
      totalSubmissions: total,
      traits,
      classificationBreakdown,
      itemAnalytics,
      dimensionReliability,
      constructWarnings,
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
    const { data: submissionRows, error: submissionsError } = await adminClient
      .from('assessment_submissions')
      .select('id, assessment_invitations!inner(cohort_id)')
      .eq('assessment_id', assessmentId)
      .eq('is_preview_sample', false)
      .eq('excluded_from_analysis', false)
      .eq('assessment_invitations.cohort_id', cohortId)

    if (submissionsError) return []

    const submissionIds = (submissionRows ?? []).map((row) => row.id as string)
    if (submissionIds.length === 0) return []

    const { data: sessionRows, error: sessionsError } = await adminClient
      .from('session_scores')
      .select('id')
      .eq('assessment_id', assessmentId)
      .eq('status', 'ok')
      .in('submission_id', submissionIds)

    if (sessionsError) return []

    const sessionIds = (sessionRows ?? []).map((row) => row.id as string)
    if (sessionIds.length === 0) return []

    const { data: scoreRows, error: scoresError } = await adminClient
      .from('trait_scores')
      .select('raw_score')
      .eq('trait_id', traitId)
      .in('session_score_id', sessionIds)

    if (scoresError) return []

    return (scoreRows ?? []).map((row) => row.raw_score as number)
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
