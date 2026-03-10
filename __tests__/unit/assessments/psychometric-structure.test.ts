import { describe, expect, it, vi } from 'vitest'
import {
  buildScaleMatrix,
  loadAssessmentPsychometricStructure,
  resolveKeyedItemValue,
  type PsychometricScale,
} from '@/utils/assessments/psychometric-structure'

function makeAdminClient({
  questions,
  traits,
}: {
  questions: unknown[]
  traits: unknown[]
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'assessment_questions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: questions, error: null }),
              }),
            }),
          }),
        }
      }

      if (table === 'assessment_traits') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: traits, error: null }),
            }),
          }),
        }
      }

      if (table === 'assessments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }
      }

      throw new Error(`Unexpected table ${table}`)
    }),
  }
}

describe('psychometric structure', () => {
  it('prefers trait scales and emits unmapped-question warnings', async () => {
    const adminClient = makeAdminClient({
      questions: [
        {
          id: 'q1-id',
          question_key: 'q1',
          text: 'Question 1',
          dimension: 'strategy',
          is_reverse_coded: false,
          sort_order: 10,
        },
        {
          id: 'q2-id',
          question_key: 'q2',
          text: 'Question 2',
          dimension: 'strategy',
          is_reverse_coded: true,
          sort_order: 20,
        },
        {
          id: 'q3-id',
          question_key: 'q3',
          text: 'Question 3',
          dimension: 'execution',
          is_reverse_coded: false,
          sort_order: 30,
        },
      ],
      traits: [
        {
          id: 'trait-1',
          code: 'strategic',
          name: 'Strategic',
          dimension_id: 'dim-1',
          assessment_dimensions: { id: 'dim-1', code: 'strategy', name: 'Strategy' },
          trait_question_mappings: [
            { question_id: 'q1-id', weight: 1, reverse_scored: false },
            { question_id: 'q2-id', weight: 1, reverse_scored: false },
          ],
        },
      ],
    })

    const result = await loadAssessmentPsychometricStructure(adminClient as never, 'assessment-1')

    expect(result.hasTraitScales).toBe(true)
    expect(result.primaryScales.map((scale) => scale.key)).toEqual(['strategic'])
    expect(result.warnings.map((warning) => warning.code)).toContain('legacy_question_unmapped')
    // reverse_scoring_mismatch no longer exists — question.isReverseCoded is the single source of truth
    const strategicScale = result.primaryScales.find((s) => s.key === 'strategic')
    const q2Item = strategicScale?.items.find((i) => i.questionKey === 'q2')
    expect(q2Item?.reverseScored).toBe(true)
  })

  it('reverses items correctly on a 7-point scale', () => {
    const scale: Pick<PsychometricScale, 'items'> = {
      items: [
        {
          questionId: 'q1-id',
          questionKey: 'q1',
          text: 'Question 1',
          weight: 1,
          reverseScored: true,
          legacyDimension: null,
          sortOrder: 10,
        },
      ],
    }

    // Default 5-point scale
    const matrix5 = buildScaleMatrix(scale, [{ q1: 1 }, { q1: 5 }])
    expect(matrix5).toEqual([[5, 1]])

    // 7-point scale: resolveKeyedItemValue(item, {q1: 7}, 7) === 1
    // resolveKeyedItemValue(item, {q1: 1}, 7) === 7
    expect(resolveKeyedItemValue({ questionKey: 'q1', reverseScored: true }, { q1: 7 }, 7)).toBe(1)
    expect(resolveKeyedItemValue({ questionKey: 'q1', reverseScored: true }, { q1: 1 }, 7)).toBe(7)
  })

  it('builds keyed matrices using reverse-scored items', () => {
    const scale: Pick<PsychometricScale, 'items'> = {
      items: [
        {
          questionId: 'q1-id',
          questionKey: 'q1',
          text: 'Question 1',
          weight: 1,
          reverseScored: false,
          legacyDimension: 'strategy',
          sortOrder: 10,
        },
        {
          questionId: 'q2-id',
          questionKey: 'q2',
          text: 'Question 2',
          weight: 1,
          reverseScored: true,
          legacyDimension: 'strategy',
          sortOrder: 20,
        },
      ],
    }

    const matrix = buildScaleMatrix(scale, [
      { q1: 1, q2: 1 },
      { q1: 5, q2: 5 },
    ])

    expect(matrix).toEqual([
      [1, 5],
      [5, 1],
    ])
  })
})
