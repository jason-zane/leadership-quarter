import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/assessments/api-auth', () => ({
  requireDashboardApiAuth: vi.fn(),
}))
vi.mock('@/utils/assessments/rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/utils/security/request-rate-limit', () => ({
  getRateLimitHeaders: vi.fn().mockReturnValue(new Headers({ 'retry-after': '30' })),
  logRateLimitExceededForRequest: vi.fn(),
}))
vi.mock('@/utils/services/admin-assessment-invitations', () => ({
  listAdminAssessmentInvitations: vi.fn(),
  createAdminAssessmentInvitations: vi.fn(),
  createAdminCohortInvitations: vi.fn(),
}))
vi.mock('@/utils/services/admin-assessment-questions', () => ({
  listAdminAssessmentQuestions: vi.fn(),
  createAdminAssessmentQuestions: vi.fn(),
  updateAdminAssessmentQuestion: vi.fn(),
  deleteAdminAssessmentQuestion: vi.fn(),
}))

import { POST as postAssessmentInvitations } from '@/app/api/admin/assessments/[id]/invitations/route'
import { GET as getAssessmentInvitations } from '@/app/api/admin/assessments/[id]/invitations/route'
import { POST as postCohortInvitations } from '@/app/api/admin/assessments/[id]/cohorts/[cohortId]/invitations/route'
import { GET as getQuestions, POST as postQuestions } from '@/app/api/admin/assessments/[id]/questions/route'
import {
  DELETE as deleteQuestion,
  PUT as putQuestion,
} from '@/app/api/admin/assessments/[id]/questions/[qid]/route'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  createAdminAssessmentInvitations,
  createAdminCohortInvitations,
  listAdminAssessmentInvitations,
} from '@/utils/services/admin-assessment-invitations'
import {
  createAdminAssessmentQuestions,
  deleteAdminAssessmentQuestion,
  listAdminAssessmentQuestions,
  updateAdminAssessmentQuestion,
} from '@/utils/services/admin-assessment-questions'

const allowedRateLimit = { allowed: true, limit: 6, remaining: 5, reset: 0 }

function makeAuthSuccess() {
  return {
    ok: true as const,
    user: { id: 'admin-user' },
    role: 'admin' as const,
    adminClient: {},
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireDashboardApiAuth).mockResolvedValue(makeAuthSuccess() as never)
  vi.mocked(checkRateLimit).mockResolvedValue(allowedRateLimit)
})

describe('admin assessment invitation and question routes', () => {
  it('lists assessment invitations', async () => {
    vi.mocked(listAdminAssessmentInvitations).mockResolvedValue({
      ok: true,
      data: {
        invitations: [
          {
            id: 'inv-1',
            assessment_id: 'a-1',
            cohort_id: null,
            token: 'token-1',
            email: 'ada@example.com',
            first_name: 'Ada',
            last_name: 'Lovelace',
            organisation: 'Analytical Engines',
            role: 'Lead',
            status: 'pending',
            sent_at: null,
            opened_at: null,
            started_at: null,
            completed_at: null,
            expires_at: null,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    })

    const res = await getAssessmentInvitations(new Request('http://localhost/api/admin/assessments/a-1/invitations'), {
      params: Promise.resolve({ id: 'a-1' }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.invitations).toHaveLength(1)
  })

  it('maps invalid invitation batches to 400', async () => {
    vi.mocked(createAdminAssessmentInvitations).mockResolvedValue({
      ok: false,
      error: 'invalid_invitations',
      errors: [{ row_index: 0, code: 'missing_required', message: 'email is required' }],
    })

    const res = await postAssessmentInvitations(
      new Request('http://localhost/api/admin/assessments/a-1/invitations', {
        method: 'POST',
        body: JSON.stringify({ invitations: [] }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ id: 'a-1' }) }
    )

    expect(res.status).toBe(400)
  })

  it('creates cohort invitations on success', async () => {
    vi.mocked(createAdminCohortInvitations).mockResolvedValue({
      ok: true,
      data: {
        invitations: [
          {
            id: 'inv-1',
            token: 'token-1',
            email: 'ada@example.com',
            first_name: 'Ada',
            last_name: 'Lovelace',
            status: 'pending',
            assessment_id: 'a-1',
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    })

    const res = await postCohortInvitations(
      new Request('http://localhost/api/admin/assessments/a-1/cohorts/c-1/invitations', {
        method: 'POST',
        body: JSON.stringify({ invitations: [{ email: 'ada@example.com' }] }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ id: 'a-1', cohortId: 'c-1' }) }
    )

    expect(res.status).toBe(201)
  })

  it('lists questions', async () => {
    vi.mocked(listAdminAssessmentQuestions).mockResolvedValue({
      ok: true,
      data: {
        questions: [
          {
            id: 'q-1',
            assessment_id: 'a-1',
            question_key: 'q1',
            text: 'Question 1',
            dimension: 'leadership',
            is_reverse_coded: false,
            sort_order: 10,
            is_active: true,
          },
        ],
      },
    })

    const res = await getQuestions(new Request('http://localhost/api/admin/assessments/a-1/questions'), {
      params: Promise.resolve({ id: 'a-1' }),
    })
    const body = await res.json()

    expect(body.questions).toHaveLength(1)
  })

  it('maps invalid question payloads to 400', async () => {
    vi.mocked(createAdminAssessmentQuestions).mockResolvedValue({
      ok: false,
      error: 'invalid_fields',
    })

    const res = await postQuestions(
      new Request('http://localhost/api/admin/assessments/a-1/questions', {
        method: 'POST',
        body: JSON.stringify([{}]),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ id: 'a-1' }) }
    )

    expect(res.status).toBe(400)
  })

  it('maps question update failures to 500', async () => {
    vi.mocked(updateAdminAssessmentQuestion).mockResolvedValue({
      ok: false,
      error: 'scoring_config_sync_failed',
      message: 'assessment_not_found',
    })

    const res = await putQuestion(
      new Request('http://localhost/api/admin/assessments/a-1/questions/q-1', {
        method: 'PUT',
        body: JSON.stringify({ dimension: 'new-dimension' }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ id: 'a-1', qid: 'q-1' }) }
    )

    expect(res.status).toBe(500)
  })

  it('deletes questions on success', async () => {
    vi.mocked(deleteAdminAssessmentQuestion).mockResolvedValue({ ok: true })

    const res = await deleteQuestion(
      new Request('http://localhost/api/admin/assessments/a-1/questions/q-1', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: 'a-1', qid: 'q-1' }) }
    )

    expect(res.status).toBe(200)
  })
})
