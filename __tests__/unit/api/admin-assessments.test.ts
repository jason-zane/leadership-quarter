import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/utils/assessments/api-auth', () => ({
  requireDashboardApiAuth: vi.fn(),
}))
vi.mock('@/utils/services/admin-assessments', () => ({
  listAdminAssessments: vi.fn(),
  createAdminAssessment: vi.fn(),
  getAdminAssessment: vi.fn(),
  updateAdminAssessment: vi.fn(),
  deleteAdminAssessment: vi.fn(),
}))

import { GET as getAssessments, POST as postAssessment } from '@/app/api/admin/assessments/route'
import {
  DELETE as deleteAssessment,
  GET as getAssessment,
  PUT as putAssessment,
} from '@/app/api/admin/assessments/[id]/route'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  createAdminAssessment,
  deleteAdminAssessment,
  getAdminAssessment,
  listAdminAssessments,
  updateAdminAssessment,
} from '@/utils/services/admin-assessments'

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

describe('admin assessment routes', () => {
  it('lists assessments and preserves the surveys alias', async () => {
    vi.mocked(listAdminAssessments).mockResolvedValue({
      ok: true,
      data: {
        assessments: [{ id: 'a-1', name: 'Assessment 1' }],
      },
    })

    const res = await getAssessments()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.assessments).toHaveLength(1)
    expect(body.surveys).toHaveLength(1)
  })

  it('maps invalid assessment creation payloads to 400', async () => {
    vi.mocked(createAdminAssessment).mockResolvedValue({
      ok: false,
      error: 'invalid_fields',
    })

    const res = await postAssessment(
      new Request('http://localhost/api/admin/assessments', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
      })
    )

    expect(res.status).toBe(400)
  })

  it('maps missing assessments to 404', async () => {
    vi.mocked(getAdminAssessment).mockResolvedValue({
      ok: false,
      error: 'survey_not_found',
    })

    const res = await getAssessment(new Request('http://localhost/api/admin/assessments/a-1'), {
      params: Promise.resolve({ id: 'a-1' }),
    })

    expect(res.status).toBe(404)
  })

  it('maps publishability failures to 400', async () => {
    vi.mocked(updateAdminAssessment).mockResolvedValue({
      ok: false,
      error: 'assessment_not_publishable',
      issues: [{ key: 'coverage' }],
      coverage: { overall: 0.5 },
    })

    const res = await putAssessment(
      new Request('http://localhost/api/admin/assessments/a-1', {
        method: 'PUT',
        body: JSON.stringify({ status: 'active' }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ id: 'a-1' }) }
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.issues).toHaveLength(1)
  })

  it('passes auth failures through unchanged', async () => {
    vi.mocked(requireDashboardApiAuth).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 }),
    } as never)

    const res = await deleteAssessment(new Request('http://localhost/api/admin/assessments/a-1'), {
      params: Promise.resolve({ id: 'a-1' }),
    })

    expect(res.status).toBe(403)
  })

  it('deletes assessments on success', async () => {
    vi.mocked(deleteAdminAssessment).mockResolvedValue({ ok: true })

    const res = await deleteAssessment(new Request('http://localhost/api/admin/assessments/a-1'), {
      params: Promise.resolve({ id: 'a-1' }),
    })

    expect(res.status).toBe(200)
  })
})
