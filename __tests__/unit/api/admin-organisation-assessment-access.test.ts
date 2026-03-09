import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/assessments/api-auth', () => ({
  requireDashboardApiAuth: vi.fn(),
}))
vi.mock('@/utils/services/organisation-assessment-access', () => ({
  listOrganisationAssessmentAccess: vi.fn(),
  upsertOrganisationAssessmentAccess: vi.fn(),
  updateOrganisationAssessmentAccess: vi.fn(),
  deleteOrganisationAssessmentAccess: vi.fn(),
}))

import { GET as getAssessmentAccess, POST as postAssessmentAccess } from '@/app/api/admin/organisations/[id]/assessment-access/route'
import {
  DELETE as deleteAssessmentAccess,
  PATCH as patchAssessmentAccess,
} from '@/app/api/admin/organisations/[id]/assessment-access/[accessId]/route'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  deleteOrganisationAssessmentAccess,
  listOrganisationAssessmentAccess,
  updateOrganisationAssessmentAccess,
  upsertOrganisationAssessmentAccess,
} from '@/utils/services/organisation-assessment-access'

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

describe('organisation assessment access routes', () => {
  it('lists access rows', async () => {
    vi.mocked(listOrganisationAssessmentAccess).mockResolvedValue({
      ok: true,
      data: { access: [{ id: 'acc-1' }] },
    })

    const res = await getAssessmentAccess(new Request('http://localhost/api/admin/organisations/org-1/assessment-access'), {
      params: Promise.resolve({ id: 'org-1' }),
    })
    const body = await res.json()

    expect(body.access).toHaveLength(1)
  })

  it('maps missing assessment ids to 400', async () => {
    vi.mocked(upsertOrganisationAssessmentAccess).mockResolvedValue({
      ok: false,
      error: 'assessment_id_required',
    })

    const res = await postAssessmentAccess(
      new Request('http://localhost/api/admin/organisations/org-1/assessment-access', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ id: 'org-1' }) }
    )

    expect(res.status).toBe(400)
  })

  it('maps invalid access updates to 400', async () => {
    vi.mocked(updateOrganisationAssessmentAccess).mockResolvedValue({
      ok: false,
      error: 'invalid_payload',
    })

    const res = await patchAssessmentAccess(
      new Request('http://localhost/api/admin/organisations/org-1/assessment-access/acc-1', {
        method: 'PATCH',
      }),
      { params: Promise.resolve({ id: 'org-1', accessId: 'acc-1' }) }
    )

    expect(res.status).toBe(400)
  })

  it('deletes access rows on success', async () => {
    vi.mocked(deleteOrganisationAssessmentAccess).mockResolvedValue({ ok: true })

    const res = await deleteAssessmentAccess(
      new Request('http://localhost/api/admin/organisations/org-1/assessment-access/acc-1', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: 'org-1', accessId: 'acc-1' }) }
    )

    expect(res.status).toBe(200)
  })
})
