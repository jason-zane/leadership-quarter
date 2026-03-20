import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SubmitAssessmentParams } from '@/utils/assessments/submission-pipeline'
import type { ScoringEngineType } from '@/utils/assessments/types'

// ---------------------------------------------------------------------------
// Module mocks (hoisted)
// ---------------------------------------------------------------------------
vi.mock('@/utils/assessments/engines', () => ({
  runScoringEngine: vi.fn(),
}))

vi.mock('@/utils/assessments/runtime', () => ({
  resolveAssessmentRuntime: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------
import { submitAssessment } from '@/utils/assessments/submission-pipeline'
import { runScoringEngine } from '@/utils/assessments/engines'
import { resolveAssessmentRuntime } from '@/utils/assessments/runtime'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRuntime(overrides: Record<string, unknown> = {}) {
  return {
    id: 'assess-1',
    key: 'ai_readiness_v1',
    name: 'AI Readiness',
    status: 'active',
    scoringEngine: 'rule_based' as ScoringEngineType,
    scoringConfig: { dimensions: [], classifications: [] },
    runtimeVersion: 'v2' as const,
    v2ScalePoints: 5,
    v2ScaleOrder: 'ascending' as const,
    v2QuestionBank: {
      version: 1,
      traits: [{ id: 't1', key: 'trait1', externalName: 'Trait 1', internalName: '', definition: '', competencyKeys: [] }],
      scoredItems: [
        { id: 'q1', key: 'q1', text: 'Q1', traitKey: 'trait1', isReverseCoded: false, weight: 1 },
        { id: 'q2', key: 'q2', text: 'Q2', traitKey: 'trait1', isReverseCoded: true, weight: 1 },
      ],
      dimensions: [],
      competencies: [],
      socialItems: [],
      scale: { points: 5, labels: ['SD', 'D', 'N', 'A', 'SA'], order: 'ascending' as const },
    },
    v2ScoringConfig: {},
    questions: [
      { id: 'q1', questionKey: 'q1', isReverseCoded: false },
      { id: 'q2', questionKey: 'q2', isReverseCoded: true },
    ],
    ...overrides,
  }
}

function makeEngineOutput() {
  return {
    scores: { dim1: 3.5 },
    bands: { dim1: 'mid' },
    classification: { key: 'developing', label: 'Developing', conditions: [] as never[], recommendations: ['Focus on basics'] },
    recommendations: ['Focus on basics'],
  }
}

function makeSubmitRow(id = 'sub-123') {
  return { data: { id }, error: null }
}

type MockChain = {
  insert: ReturnType<typeof vi.fn>
  select: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
}

function makeAdminClient(
  insertResult: unknown,
  updateResult: unknown = { error: null },
): { client: unknown; updateSpy: ReturnType<typeof vi.fn> } {
  const updateSpy = vi.fn()
  const invitationUpdate = { eq: vi.fn().mockResolvedValue({ error: null }) }
  const scoreUpdate: MockChain = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
    update: vi.fn().mockImplementation((payload: unknown) => {
      updateSpy(payload)
      return { eq: vi.fn().mockResolvedValue(updateResult) }
    }),
    eq: vi.fn(),
  }

  const submissionsInsert: MockChain = {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue(insertResult) }),
    }),
    select: vi.fn(),
    single: vi.fn(),
    update: scoreUpdate.update,
    eq: scoreUpdate.eq,
  }

  const client = {
    from: vi.fn((table: string) => {
      if (table === 'assessment_submissions') {
        return {
          insert: submissionsInsert.insert,
          update: scoreUpdate.update,
        }
      }
      if (table === 'assessment_invitations') {
        return { update: vi.fn().mockReturnValue(invitationUpdate) }
      }
      return {}
    }),
  }

  return { client, updateSpy }
}

const baseParams = (adminClient: unknown): SubmitAssessmentParams => ({
  adminClient: adminClient as Parameters<typeof submitAssessment>[0]['adminClient'],
  assessmentId: 'assess-1',
  responses: { q1: 3, q2: 2 },
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

describe('submitAssessment', () => {
  it('happy path: valid responses → returns ok with submission id', async () => {
    const runtime = makeRuntime()
    vi.mocked(resolveAssessmentRuntime).mockResolvedValue({ ok: true, runtime })
    vi.mocked(runScoringEngine).mockResolvedValue(makeEngineOutput())
    const { client: adminClient } = makeAdminClient(makeSubmitRow())

    const result = await submitAssessment(baseParams(adminClient))

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.submissionId).toBe('sub-123')
    }
  })

  it('assessment_not_active → returns error', async () => {
    vi.mocked(resolveAssessmentRuntime).mockResolvedValue({
      ok: true,
      runtime: makeRuntime({ status: 'inactive' }),
    })
    const { client: adminClient } = makeAdminClient(makeSubmitRow())

    const result = await submitAssessment(baseParams(adminClient))

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('assessment_not_active')
  })

  it('assessment_not_found → propagates runtime error', async () => {
    vi.mocked(resolveAssessmentRuntime).mockResolvedValue({ ok: false, error: 'assessment_not_found' })
    const { client: adminClient } = makeAdminClient(makeSubmitRow())

    const result = await submitAssessment(baseParams(adminClient))

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('assessment_not_found')
  })

  it('response out of Likert range (0) → invalid_responses', async () => {
    vi.mocked(resolveAssessmentRuntime).mockResolvedValue({ ok: true, runtime: makeRuntime() })
    const { client: adminClient } = makeAdminClient(makeSubmitRow())

    const result = await submitAssessment({
      ...baseParams(adminClient),
      responses: { q1: 0, q2: 2 },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_responses')
  })

  it('response out of Likert range (6) → invalid_responses', async () => {
    vi.mocked(resolveAssessmentRuntime).mockResolvedValue({ ok: true, runtime: makeRuntime() })
    const { client: adminClient } = makeAdminClient(makeSubmitRow())

    const result = await submitAssessment({
      ...baseParams(adminClient),
      responses: { q1: 6, q2: 2 },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_responses')
  })

  it('reverse-coded question: value 1 → stored as 5', async () => {
    const runtime = makeRuntime()
    vi.mocked(resolveAssessmentRuntime).mockResolvedValue({ ok: true, runtime })
    const { client: adminClient, updateSpy } = makeAdminClient(makeSubmitRow())

    await submitAssessment({ ...baseParams(adminClient), responses: { q1: 3, q2: 1 } })

    // q2 is reverse-coded: 6 - 1 = 5
    const updatePayload = updateSpy.mock.calls[0]?.[0] as Record<string, Record<string, number>> | undefined
    expect(updatePayload?.normalized_responses?.['q2']).toBe(5)
  })

  it('reverse-coded question: value 3 → stored as 3', async () => {
    vi.mocked(resolveAssessmentRuntime).mockResolvedValue({ ok: true, runtime: makeRuntime() })
    const { client: adminClient, updateSpy } = makeAdminClient(makeSubmitRow())

    await submitAssessment({ ...baseParams(adminClient), responses: { q1: 3, q2: 3 } })

    const updatePayload = updateSpy.mock.calls[0]?.[0] as Record<string, Record<string, number>> | undefined
    expect(updatePayload?.normalized_responses?.['q2']).toBe(3)
  })

  it('DB insert fails → returns submission_failed without calling scoring engine', async () => {
    vi.mocked(resolveAssessmentRuntime).mockResolvedValue({ ok: true, runtime: makeRuntime() })
    const { client: adminClient } = makeAdminClient({ data: null, error: { message: 'db error' } })

    const result = await submitAssessment(baseParams(adminClient))

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('submission_failed')
    expect(runScoringEngine).not.toHaveBeenCalled()
  })

  it('no invitation → submission still created, no invitation update attempted', async () => {
    vi.mocked(resolveAssessmentRuntime).mockResolvedValue({ ok: true, runtime: makeRuntime() })
    const { client: adminClient } = makeAdminClient(makeSubmitRow()) as { client: { from: ReturnType<typeof vi.fn> }; updateSpy: ReturnType<typeof vi.fn> }

    const result = await submitAssessment({ ...baseParams(adminClient), invitation: undefined })

    expect(result.ok).toBe(true)
    // assessment_invitations table should not have been touched
    const calls = (adminClient.from as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0])
    expect(calls).not.toContain('assessment_invitations')
  })

  it('invitation data takes precedence over participant data', async () => {
    vi.mocked(resolveAssessmentRuntime).mockResolvedValue({ ok: true, runtime: makeRuntime() })
    let capturedInsertPayload: Record<string, unknown> = {}
    vi.mocked(runScoringEngine).mockResolvedValue(makeEngineOutput())

    const mockFrom = vi.fn((table: string) => {
      if (table === 'assessment_submissions') {
        return {
          insert: vi.fn((payload: Record<string, unknown>) => {
            capturedInsertPayload = payload
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(makeSubmitRow()),
              }),
            }
          }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        }
      }
      if (table === 'assessment_invitations') {
        return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) }
      }
      return {}
    })

    const adminClient = { from: mockFrom }

    await submitAssessment({
      ...baseParams(adminClient),
      invitation: {
        id: 'inv-1',
        contactId: 'contact-inv',
        firstName: 'Inv First',
        lastName: 'Inv Last',
        email: 'inv@example.com',
        organisation: 'Inv Org',
        role: 'manager',
        startedAt: null,
      },
      participant: {
        firstName: 'Part First',
        lastName: 'Part Last',
        email: 'part@example.com',
        organisation: 'Part Org',
        role: 'staff',
        contactId: 'contact-part',
      },
    })

    expect(capturedInsertPayload).toMatchObject({
      first_name: 'Inv First',
      email: 'inv@example.com',
      contact_id: 'contact-inv',
    })
  })
})
