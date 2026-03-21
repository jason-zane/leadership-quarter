import { describe, expect, it, vi } from 'vitest'
import { normalizeV2QuestionBank } from '@/utils/assessments/assessment-question-bank'
import {
  getAdminAssessmentQuestionBank as getAdminAssessmentV2QuestionBank,
  saveAdminAssessmentQuestionBank as saveAdminAssessmentV2QuestionBank,
} from '@/utils/services/admin-assessment-question-bank'

function createAssessmentClient(initialQuestionBank: unknown) {
  const record: {
    id: string
    v2_question_bank: ReturnType<typeof normalizeV2QuestionBank>
    report_config: Record<string, unknown>
  } = {
    id: 'assessment-1',
    v2_question_bank: normalizeV2QuestionBank(initialQuestionBank),
    report_config: {},
  }

  return {
    from: vi.fn((table: string) => {
      if (table !== 'assessments') return {}

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { ...record },
              error: null,
            }),
          })),
        })),
        update: vi.fn((payload: Record<string, unknown>) => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              maybeSingle: vi.fn().mockImplementation(async () => {
                if ('v2_question_bank' in payload) {
                  record.v2_question_bank = normalizeV2QuestionBank(payload.v2_question_bank)
                }
                if ('report_config' in payload) {
                  record.report_config = (payload.report_config ?? {}) as Record<string, unknown>
                }
                return {
                  data: { ...record },
                  error: null,
                }
              }),
            })),
          })),
        })),
      }
    }),
  }
}

describe('admin-assessment-v2-question-bank service', () => {
  it('persists deleted dimensions after save and reload', async () => {
    const client = createAssessmentClient({
      dimensions: [
        { id: 'dimension-1', key: 'thinking', internalName: 'Thinking', externalName: 'Thinking', definition: '' },
      ],
      competencies: [
        {
          id: 'competency-1',
          key: 'judgement',
          internalName: 'Judgement',
          externalName: 'Judgement',
          definition: '',
          dimensionKeys: ['thinking'],
        },
      ],
      traits: [
        {
          id: 'trait-1',
          key: 'curiosity',
          internalName: 'Curiosity',
          externalName: 'Curiosity',
          definition: '',
          competencyKeys: ['judgement'],
        },
      ],
      scoredItems: [
        { id: 'item-1', key: 'q1', text: 'Question', traitKey: 'curiosity', isReverseCoded: false, weight: 1 },
      ],
    })

    const saveResult = await saveAdminAssessmentV2QuestionBank({
      adminClient: client as never,
      assessmentId: 'assessment-1',
      questionBank: {
        dimensions: [],
        competencies: [
          {
            id: 'competency-1',
            key: 'judgement',
            internalName: 'Judgement',
            externalName: 'Judgement',
            definition: '',
            dimensionKeys: [],
          },
        ],
        traits: [
          {
            id: 'trait-1',
            key: 'curiosity',
            internalName: 'Curiosity',
            externalName: 'Curiosity',
            definition: '',
            competencyKeys: ['judgement'],
          },
        ],
        scoredItems: [
          { id: 'item-1', key: 'q1', text: 'Question', traitKey: 'curiosity', isReverseCoded: false, weight: 1 },
        ],
      },
    })

    expect(saveResult.ok).toBe(true)
    if (!saveResult.ok) return

    expect(saveResult.data.questionBank.dimensions).toEqual([])
    expect(saveResult.data.questionBank.competencies[0]?.dimensionKeys).toEqual([])

    const loadResult = await getAdminAssessmentV2QuestionBank({
      adminClient: client as never,
      assessmentId: 'assessment-1',
    })

    expect(loadResult.ok).toBe(true)
    if (!loadResult.ok) return

    expect(loadResult.data.questionBank.dimensions).toEqual([])
    expect(loadResult.data.questionBank.competencies[0]?.dimensionKeys).toEqual([])
  })

  it('persists deleted competencies after save and reload', async () => {
    const client = createAssessmentClient({
      competencies: [
        {
          id: 'competency-1',
          key: 'judgement',
          internalName: 'Judgement',
          externalName: 'Judgement',
          definition: '',
          dimensionKeys: [],
        },
      ],
      traits: [
        {
          id: 'trait-1',
          key: 'curiosity',
          internalName: 'Curiosity',
          externalName: 'Curiosity',
          definition: '',
          competencyKeys: ['judgement'],
        },
      ],
      scoredItems: [
        { id: 'item-1', key: 'q1', text: 'Question', traitKey: 'curiosity', isReverseCoded: false, weight: 1 },
      ],
    })

    const saveResult = await saveAdminAssessmentV2QuestionBank({
      adminClient: client as never,
      assessmentId: 'assessment-1',
      questionBank: {
        competencies: [],
        traits: [
          {
            id: 'trait-1',
            key: 'curiosity',
            internalName: 'Curiosity',
            externalName: 'Curiosity',
            definition: '',
            competencyKeys: [],
          },
        ],
        scoredItems: [
          { id: 'item-1', key: 'q1', text: 'Question', traitKey: 'curiosity', isReverseCoded: false, weight: 1 },
        ],
      },
    })

    expect(saveResult.ok).toBe(true)
    if (!saveResult.ok) return

    expect(saveResult.data.questionBank.competencies).toEqual([])
    expect(saveResult.data.questionBank.traits[0]?.competencyKeys).toEqual([])

    const loadResult = await getAdminAssessmentV2QuestionBank({
      adminClient: client as never,
      assessmentId: 'assessment-1',
    })

    expect(loadResult.ok).toBe(true)
    if (!loadResult.ok) return

    expect(loadResult.data.questionBank.competencies).toEqual([])
    expect(loadResult.data.questionBank.traits[0]?.competencyKeys).toEqual([])
  })
})
