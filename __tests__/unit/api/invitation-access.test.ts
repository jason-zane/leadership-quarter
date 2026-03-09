import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/services/assessment-invitation-access', () => ({
  getAssessmentInvitation: vi.fn(),
}))

import { GET } from '@/app/api/assessments/invitation/[token]/route'
import { getAssessmentInvitation } from '@/utils/services/assessment-invitation-access'

const params = Promise.resolve({ token: 'tok123' })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/assessments/invitation/[token]', () => {
  it('returns invitation assessment payload from the service', async () => {
    vi.mocked(getAssessmentInvitation).mockResolvedValue({
      ok: true,
      data: {
        assessment: {
          id: 'assess-1',
          key: 'ai',
          name: 'AI Readiness',
          description: null,
          version: 1,
        },
        survey: {
          id: 'assess-1',
          key: 'ai',
          name: 'AI Readiness',
          description: null,
          version: 1,
        },
        questions: [],
        invitation: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          organisation: 'Org',
          role: 'Lead',
        },
      },
    })

    const res = await GET(new Request('http://localhost/api/assessments/invitation/tok123'), { params })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.assessment.key).toBe('ai')
  })

  it('maps not found errors to 404', async () => {
    vi.mocked(getAssessmentInvitation).mockResolvedValue({
      ok: false,
      error: 'invitation_not_found',
    })

    const res = await GET(new Request('http://localhost/api/assessments/invitation/tok123'), { params })

    expect(res.status).toBe(404)
  })

  it('maps availability errors to 410', async () => {
    vi.mocked(getAssessmentInvitation).mockResolvedValue({
      ok: false,
      error: 'invitation_expired',
    })

    const res = await GET(new Request('http://localhost/api/assessments/invitation/tok123'), { params })

    expect(res.status).toBe(410)
  })

  it('maps service configuration errors to 500', async () => {
    vi.mocked(getAssessmentInvitation).mockResolvedValue({
      ok: false,
      error: 'missing_service_role',
      message: 'Supabase admin credentials are not configured.',
    })

    const res = await GET(new Request('http://localhost/api/assessments/invitation/tok123'), { params })

    expect(res.status).toBe(500)
  })
})
