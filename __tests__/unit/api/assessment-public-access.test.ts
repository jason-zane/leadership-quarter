import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/services/assessment-public-access', () => ({
  getPublicAssessment: vi.fn(),
}))

import { GET } from '@/app/api/assessments/public/[assessmentKey]/route'
import { getPublicAssessment } from '@/utils/services/assessment-public-access'

const params = Promise.resolve({ assessmentKey: 'ai-readiness' })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/assessments/public/[assessmentKey]', () => {
  it('returns the public assessment payload from the service', async () => {
    vi.mocked(getPublicAssessment).mockResolvedValue({
      ok: true,
      data: {
        assessment: {
          id: 'assess-1',
          key: 'ai-readiness',
          name: 'AI Readiness',
          description: null,
          version: 2,
        },
        survey: {
          id: 'assess-1',
          key: 'ai-readiness',
          name: 'AI Readiness',
          description: null,
          version: 2,
        },
        questions: [],
      },
    })

    const res = await GET(
      new Request('http://localhost/api/assessments/public/ai-readiness'),
      { params }
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.survey.key).toBe('ai-readiness')
  })

  it('maps missing surveys to 404', async () => {
    vi.mocked(getPublicAssessment).mockResolvedValue({
      ok: false,
      error: 'survey_not_found',
    })

    const res = await GET(
      new Request('http://localhost/api/assessments/public/ai-readiness'),
      { params }
    )

    expect(res.status).toBe(404)
  })

  it('maps configuration failures to 500 and preserves the message', async () => {
    vi.mocked(getPublicAssessment).mockResolvedValue({
      ok: false,
      error: 'missing_service_role',
      message: 'Supabase admin credentials are not configured.',
    })

    const res = await GET(
      new Request('http://localhost/api/assessments/public/ai-readiness'),
      { params }
    )
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.message).toBe('Supabase admin credentials are not configured.')
  })
})
