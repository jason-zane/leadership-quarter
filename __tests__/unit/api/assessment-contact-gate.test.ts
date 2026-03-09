import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/services/assessment-contact-gate', () => ({
  getAssessmentContactGate: vi.fn(),
  unlockAssessmentContactGate: vi.fn(),
}))

import { GET } from '@/app/api/assessments/contact-gate/[token]/route'
import { POST } from '@/app/api/assessments/contact-gate/[token]/unlock/route'
import {
  getAssessmentContactGate,
  unlockAssessmentContactGate,
} from '@/utils/services/assessment-contact-gate'

const params = Promise.resolve({ token: 'gate-token' })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('assessment contact gate routes', () => {
  it('returns gate context payload on GET success', async () => {
    vi.mocked(getAssessmentContactGate).mockResolvedValue({
      ok: true,
      data: {
        context: {
          campaignName: 'Pilot',
          assessmentName: 'AI Readiness',
        },
      },
    })

    const res = await GET(
      new Request('http://localhost/api/assessments/contact-gate/gate-token'),
      { params }
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.context.assessmentName).toBe('AI Readiness')
  })

  it('maps gate GET failures to the correct status', async () => {
    vi.mocked(getAssessmentContactGate).mockResolvedValue({
      ok: false,
      error: 'gate_expired',
    })

    const res = await GET(
      new Request('http://localhost/api/assessments/contact-gate/gate-token'),
      { params }
    )

    expect(res.status).toBe(410)
  })

  it('returns unlock payload on POST success', async () => {
    vi.mocked(unlockAssessmentContactGate).mockResolvedValue({
      ok: true,
      data: {
        reportPath: '/assess/r/assessment',
        reportAccessToken: 'report-token',
      },
    })

    const res = await POST(
      new Request('http://localhost/api/assessments/contact-gate/gate-token/unlock', {
        method: 'POST',
        body: JSON.stringify({
          firstName: 'Ada',
          lastName: 'Lovelace',
          workEmail: 'ada@example.com',
          organisation: 'Analytical Engines',
          role: 'Lead',
          consent: true,
        }),
        headers: { 'content-type': 'application/json' },
      }),
      { params }
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.reportAccessToken).toBe('report-token')
  })

  it('maps unlock validation failures to 400', async () => {
    vi.mocked(unlockAssessmentContactGate).mockResolvedValue({
      ok: false,
      error: 'invalid_fields',
    })

    const res = await POST(
      new Request('http://localhost/api/assessments/contact-gate/gate-token/unlock', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
      }),
      { params }
    )

    expect(res.status).toBe(400)
  })

  it('maps unlock availability failures to 410', async () => {
    vi.mocked(unlockAssessmentContactGate).mockResolvedValue({
      ok: false,
      error: 'gate_invalid',
    })

    const res = await POST(
      new Request('http://localhost/api/assessments/contact-gate/gate-token/unlock', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
      }),
      { params }
    )

    expect(res.status).toBe(410)
  })
})
