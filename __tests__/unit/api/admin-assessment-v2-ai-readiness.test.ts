import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/utils/assessments/api-auth', () => ({
  requireDashboardApiAuth: vi.fn(),
}))
vi.mock('@/utils/services/admin-assessment-v2-ai-readiness', () => ({
  seedAdminAssessmentV2AiReadiness: vi.fn(),
}))

import { POST as postSeedAiReadiness } from '@/app/api/admin/assessments/[id]/v2/seed-ai-readiness/route'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { seedAdminAssessmentV2AiReadiness } from '@/utils/services/admin-assessment-v2-ai-readiness'

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
})

describe('admin assessment V2 AI readiness seed route', () => {
  it('returns 200 when the seed succeeds', async () => {
    vi.mocked(seedAdminAssessmentV2AiReadiness).mockResolvedValue({
      ok: true,
      data: {
        questionBank: { dimensions: [] },
        scoringConfig: { bandings: [] },
      },
    } as never)

    const res = await postSeedAiReadiness(new Request('http://localhost/api/admin/assessments/a-1/v2/seed-ai-readiness', {
      method: 'POST',
    }), {
      params: Promise.resolve({ id: 'a-1' }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
  })

  it('maps unsupported assessments to 400', async () => {
    vi.mocked(seedAdminAssessmentV2AiReadiness).mockResolvedValue({
      ok: false,
      error: 'assessment_not_supported',
    } as never)

    const res = await postSeedAiReadiness(new Request('http://localhost/api/admin/assessments/a-1/v2/seed-ai-readiness', {
      method: 'POST',
    }), {
      params: Promise.resolve({ id: 'a-1' }),
    })

    expect(res.status).toBe(400)
  })

  it('passes auth failures through unchanged', async () => {
    vi.mocked(requireDashboardApiAuth).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 }),
    } as never)

    const res = await postSeedAiReadiness(new Request('http://localhost/api/admin/assessments/a-1/v2/seed-ai-readiness', {
      method: 'POST',
    }), {
      params: Promise.resolve({ id: 'a-1' }),
    })

    expect(res.status).toBe(403)
  })
})
