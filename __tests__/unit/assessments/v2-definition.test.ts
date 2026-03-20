import { describe, expect, it } from 'vitest'
import {
  createV2AssessmentDefinition,
  validateV2AssessmentDefinition,
} from '@/utils/assessments/v2-definition'
import { createDefaultV2AssessmentReport } from '@/utils/reports/v2-assessment-reports'

function buildDefinition(overrides?: {
  reportConfig?: Record<string, unknown>
  questionBank?: Record<string, unknown>
  scoringConfig?: Record<string, unknown>
  psychometricsConfig?: Record<string, unknown>
  reports?: ReturnType<typeof createDefaultV2AssessmentReport>[]
}) {
  return createV2AssessmentDefinition({
    assessment: {
      id: 'assessment-1',
      key: 'ai_readiness_v2',
      name: 'AI Readiness V2',
      description: 'Shadow runtime',
      status: 'active',
      version: 3,
      runner_config: {
        title: 'AI Readiness V2',
      },
      report_config: {
        v2_runtime_enabled: true,
        ...overrides?.reportConfig,
      },
    },
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
      ...overrides?.questionBank,
    },
    scoringConfig: {
      bandings: [
        { level: 'trait', targetKey: 'curiosity', bands: [{ id: 'high', label: 'High', min: 4, max: 5, color: '#fff', meaning: 'High', behaviouralIndicators: '', strengths: '', watchouts: '', developmentFocus: '', narrativeText: '' }] },
      ],
      ...overrides?.scoringConfig,
    },
    psychometricsConfig: {
      referenceGroups: [{ id: 'group_1', key: 'default_group', label: 'Default group', description: '', norms: [] }],
      validationRuns: [],
      ...overrides?.psychometricsConfig,
    },
    reports: overrides?.reports ?? [
      createDefaultV2AssessmentReport({
        assessmentId: 'assessment-1',
        status: 'published',
        isDefault: true,
      }),
    ],
  })
}

describe('v2 definition', () => {
  it('marks a complete definition as preview and cutover valid', () => {
    const validation = validateV2AssessmentDefinition(buildDefinition())

    expect(validation.authoringValid).toBe(true)
    expect(validation.previewValid).toBe(true)
    expect(validation.cutoverValid).toBe(true)
    expect(validation.issues).toHaveLength(0)
  })

  it('blocks preview when runtime is disabled and no report is published', () => {
    const validation = validateV2AssessmentDefinition(buildDefinition({
      reportConfig: {
        v2_runtime_enabled: false,
      },
      reports: [
        createDefaultV2AssessmentReport({
          assessmentId: 'assessment-1',
          status: 'draft',
          isDefault: true,
        }),
      ],
    }))

    expect(validation.previewValid).toBe(false)
    expect(validation.cutoverValid).toBe(false)
    expect(validation.issues.map((issue) => issue.key)).toContain('runtime_disabled')
    expect(validation.issues.map((issue) => issue.key)).toContain('published_report_missing')
  })

  it('flags missing scoring banding as an authoring warning', () => {
    const validation = validateV2AssessmentDefinition(buildDefinition({
      scoringConfig: {
        bandings: [],
      },
    }))

    const bandingIssue = validation.issues.find((issue) => issue.key === 'scoring_missing_bandings')
    expect(bandingIssue).toBeDefined()
    expect(bandingIssue?.severity).toBe('warning')
    // Warnings do not fail authoring validity
    expect(validation.authoringValid).toBe(true)
  })
})
