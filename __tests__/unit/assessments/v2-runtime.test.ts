import { describe, expect, it } from 'vitest'
import {
  buildV2SubmissionArtifacts,
  buildV2RuntimeQuestions,
  scoreV2AssessmentSubmission,
  shouldUseV2Runtime,
} from '@/utils/assessments/assessment-runtime-model'

describe('v2 runtime', () => {
  it('builds runtime questions from the question bank', () => {
    const questions = buildV2RuntimeQuestions({
      traits: [
        { id: 'trait_1', key: 'curiosity', internalName: 'Curiosity', externalName: 'Curiosity', definition: '', competencyKeys: [] },
      ],
      scoredItems: [
        { id: 'item_1', key: 'q1', text: 'I like experimenting with AI.', traitKey: 'curiosity', isReverseCoded: false, weight: 1 },
      ],
      socialItems: [
        { id: 'social_1', key: 's1', text: 'I always make perfect decisions.', isReverseCoded: true },
      ],
    })

    expect(questions).toHaveLength(2)
    expect(questions[0]).toMatchObject({ question_key: 'q1', dimension: 'Curiosity' })
    expect(questions[1]).toMatchObject({ question_key: 's1', dimension: 'Social desirability' })
  })

  it('scores a V2 submission with derived outcomes', () => {
    const result = scoreV2AssessmentSubmission({
      questionBank: {
        scale: { points: 5, labels: ['1', '2', '3', '4', '5'], order: 'ascending' },
        dimensions: [
          { id: 'dim_1', key: 'openness', internalName: 'Openness', externalName: 'Openness', definition: '' },
        ],
        competencies: [
          { id: 'comp_1', key: 'adoption', internalName: 'Adoption', externalName: 'Adoption', definition: '', dimensionKeys: ['openness'] },
        ],
        traits: [
          { id: 'trait_1', key: 'curiosity', internalName: 'Curiosity', externalName: 'Curiosity', definition: '', competencyKeys: ['adoption'] },
        ],
        scoredItems: [
          { id: 'item_1', key: 'q1', text: 'Question one', traitKey: 'curiosity', isReverseCoded: false, weight: 1 },
          { id: 'item_2', key: 'q2', text: 'Question two', traitKey: 'curiosity', isReverseCoded: false, weight: 1 },
        ],
        socialItems: [],
      },
      scoringConfig: {
        transforms: { displayMode: 'raw', displayRangeMin: 1, displayRangeMax: 5 },
        bandings: [
          { level: 'trait', targetKey: 'curiosity', bands: [{ id: 'high', label: 'High', min: 4, max: 5, color: '#fff', meaning: 'High', behaviouralIndicators: '', strengths: '', watchouts: '', developmentFocus: '', narrativeText: '' }] },
          { level: 'competency', targetKey: 'adoption', bands: [{ id: 'high', label: 'High', min: 4, max: 5, color: '#fff', meaning: 'High', behaviouralIndicators: '', strengths: '', watchouts: '', developmentFocus: '', narrativeText: '' }] },
          { level: 'dimension', targetKey: 'openness', bands: [{ id: 'high', label: 'High', min: 4, max: 5, color: '#fff', meaning: 'High', behaviouralIndicators: '', strengths: '', watchouts: '', developmentFocus: '', narrativeText: '' }] },
        ],
        interpretations: [
          { level: 'dimension', targetKey: 'openness', lowMeaning: '', midMeaning: '', highMeaning: 'Strong openness', behaviouralIndicators: '', strengths: '', risksWatchouts: '', developmentFocus: 'Keep experimenting', narrativeText: '' },
        ],
        derivedOutcomes: [
          {
            id: 'set_1',
            key: 'overall_profile',
            name: 'Overall profile',
            description: '',
            level: 'dimension',
            targetKeys: ['openness'],
            outcomes: [
              { id: 'outcome_1', key: 'high_openness', label: 'High openness', shortDescription: 'Open to change', reportSummary: '', fullNarrative: '', recommendations: ['Keep going'], sortOrder: 1 },
            ],
            mappings: [
              { id: 'map_1', combination: { openness: 'high' }, outcomeKey: 'high_openness', rationale: '' },
            ],
          },
        ],
      },
      responses: { q1: 5, q2: 4 },
    })

    expect(result.scores.curiosity).toBe(4.5)
    expect(result.bands.curiosity).toBe('High')
    expect(result.classification?.label).toBe('High openness')
    expect(result.recommendations).toContain('Keep going')
  })

  it('only enables V2 runtime for preview or cutover live', () => {
    expect(shouldUseV2Runtime({ v2_runtime_enabled: true, v2_cutover_status: 'shadow_ready' })).toBe(false)
    expect(shouldUseV2Runtime({ v2_runtime_enabled: true, v2_cutover_status: 'shadow_ready' }, { forceV2: true })).toBe(true)
    expect(shouldUseV2Runtime({ v2_runtime_enabled: true, v2_cutover_status: 'cutover_live' })).toBe(true)
  })

  it('builds a canonical V2 submission artifact with metadata and report context', () => {
    const artifacts = buildV2SubmissionArtifacts({
      questionBank: {
        scale: { points: 5, labels: ['1', '2', '3', '4', '5'], order: 'ascending' },
        dimensions: [
          { id: 'dim_1', key: 'openness', internalName: 'Openness', externalName: 'Openness', definition: '' },
        ],
        competencies: [
          { id: 'comp_1', key: 'adoption', internalName: 'Adoption', externalName: 'Adoption', definition: '', dimensionKeys: ['openness'] },
        ],
        traits: [
          { id: 'trait_1', key: 'curiosity', internalName: 'Curiosity', externalName: 'Curiosity', definition: '', competencyKeys: ['adoption'] },
        ],
        scoredItems: [
          { id: 'item_1', key: 'q1', text: 'Question one', traitKey: 'curiosity', isReverseCoded: false, weight: 1 },
        ],
        socialItems: [],
      },
      scoringConfig: {
        transforms: { displayMode: 'raw', displayRangeMin: 1, displayRangeMax: 5 },
        bandings: [
          { level: 'trait', targetKey: 'curiosity', bands: [{ id: 'high', label: 'High', min: 4, max: 5, color: '#fff', meaning: 'High', behaviouralIndicators: '', strengths: '', watchouts: '', developmentFocus: '', narrativeText: '' }] },
          { level: 'competency', targetKey: 'adoption', bands: [{ id: 'high', label: 'High', min: 4, max: 5, color: '#fff', meaning: 'High', behaviouralIndicators: '', strengths: '', watchouts: '', developmentFocus: '', narrativeText: '' }] },
          { level: 'dimension', targetKey: 'openness', bands: [{ id: 'high', label: 'High', min: 4, max: 5, color: '#fff', meaning: 'High', behaviouralIndicators: '', strengths: '', watchouts: '', developmentFocus: '', narrativeText: '' }] },
        ],
        interpretations: [],
        derivedOutcomes: [],
      },
      responses: { q1: 5 },
      participant: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        organisation: 'LQ',
        role: 'Advisor',
      },
      metadata: {
        assessmentVersion: 7,
        deliveryMode: 'preview',
        runtimeSchemaVersion: 2,
        scoredAt: '2026-03-14T10:00:00.000Z',
      },
    })

    expect(artifacts.metadata).toMatchObject({
      runtimeVersion: 'v2',
      runtimeSchemaVersion: 2,
      assessmentVersion: 7,
      deliveryMode: 'preview',
      scoredAt: '2026-03-14T10:00:00.000Z',
    })
    expect(artifacts.scoring.normalizedResponses.q1).toBe(5)
    expect(artifacts.reportContext.personName).toBe('Ada Lovelace')
  })
})
