import {
  classifyResult,
  computeScores,
  getBands,
  type NumericResponseMap,
  type ScoreMap,
} from '@/utils/assessments/scoring-engine'
import { computeAndStorePsychometricScores } from '@/utils/assessments/psychometric-scoring'
import type { ScoringClassification, ScoringEngineType } from '@/utils/assessments/types'
import type { AssessmentRuntime } from '@/utils/assessments/runtime'
import { createAdminClient } from '@/utils/supabase/admin'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

export type EngineInput = {
  adminClient: AdminClient
  assessmentRuntime: AssessmentRuntime
  submissionId: string
  rawResponses: NumericResponseMap
  normalizedResponses: NumericResponseMap
}

export type EngineOutput = {
  scores: ScoreMap
  bands: Record<string, string>
  classification: ScoringClassification | null
  recommendations: string[]
}

function runRuleBased(assessmentRuntime: AssessmentRuntime, normalizedResponses: NumericResponseMap): EngineOutput {
  const scores = computeScores(normalizedResponses, assessmentRuntime.scoringConfig)
  const bands = getBands(scores, assessmentRuntime.scoringConfig)
  const classification = classifyResult(scores, assessmentRuntime.scoringConfig)
  return {
    scores,
    bands,
    classification,
    recommendations: classification?.recommendations ?? [],
  }
}

async function runPsychometric(
  input: Pick<EngineInput, 'adminClient' | 'assessmentRuntime' | 'submissionId' | 'rawResponses'>
) {
  await computeAndStorePsychometricScores(
    input.adminClient,
    input.submissionId,
    input.assessmentRuntime.id,
    input.rawResponses
  )
}

export async function runScoringEngine(
  engine: ScoringEngineType,
  input: EngineInput
): Promise<EngineOutput> {
  if (engine === 'rule_based') {
    return runRuleBased(input.assessmentRuntime, input.normalizedResponses)
  }

  if (engine === 'psychometric') {
    const output = runRuleBased(input.assessmentRuntime, input.normalizedResponses)
    await runPsychometric(input)
    return output
  }

  // hybrid: preserve rule-based compatibility output, and persist psychometric artifacts.
  const output = runRuleBased(input.assessmentRuntime, input.normalizedResponses)
  await runPsychometric(input)
  return output
}
