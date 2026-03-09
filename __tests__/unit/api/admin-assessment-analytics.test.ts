import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/assessments/api-auth', () => ({
  requireDashboardApiAuth: vi.fn(),
}))
vi.mock('@/utils/services/admin-assessment-analytics', () => ({
  getAdminAssessmentAnalytics: vi.fn(),
}))

import { GET } from '@/app/api/admin/assessments/[id]/analytics/route'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { getAdminAssessmentAnalytics } from '@/utils/services/admin-assessment-analytics'

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

describe('GET /api/admin/assessments/[id]/analytics', () => {
  it('returns analytics data', async () => {
    vi.mocked(getAdminAssessmentAnalytics).mockResolvedValue({
      ok: true,
      data: {
        totalSubmissions: 12,
        traits: [
          {
            traitId: 't-1',
            code: 'STRAT',
            name: 'Strategy',
            count: 12,
            mean: 3.8,
            sd: 0.7,
            percentiles: {
              p25: 3,
              p50: 4,
              p75: 4,
            },
          },
        ],
        classificationBreakdown: [{ key: 'emerging', label: 'Emerging', count: 12, pct: 100 }],
        itemAnalytics: [],
        dimensionReliability: [],
      },
    })

    const res = await GET(new Request('http://localhost/api/admin/assessments/a-1/analytics'), {
      params: Promise.resolve({ id: 'a-1' }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.totalSubmissions).toBe(12)
  })
})
