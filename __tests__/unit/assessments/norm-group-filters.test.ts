import { describe, expect, it, vi } from 'vitest'
import { resolveNormGroupSubmissionIds } from '@/utils/assessments/norm-group-filters'

function makeAdminClient({
  submissions,
  invitations = [],
}: {
  submissions: unknown[]
  invitations?: unknown[]
}) {
  const submissionEq = vi
    .fn()
    .mockImplementationOnce(() => ({ eq: submissionEq }))
    .mockResolvedValue({ data: submissions, error: null })

  return {
    from: vi.fn((table: string) => {
      if (table === 'assessment_submissions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: submissionEq,
          }),
        }
      }

      if (table === 'assessment_invitations') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: invitations, error: null }),
          }),
        }
      }

      throw new Error(`Unexpected table ${table}`)
    }),
  }
}

describe('resolveNormGroupSubmissionIds', () => {
  it('filters submissions by campaign, date window, and demographics', async () => {
    const adminClient = makeAdminClient({
      submissions: [
        {
          id: 'submission-1',
          invitation_id: 'inv-1',
          campaign_id: 'campaign-a',
          demographics: { region: 'apac', role: 'manager' },
          created_at: '2026-01-10T00:00:00.000Z',
        },
        {
          id: 'submission-2',
          invitation_id: 'inv-2',
          campaign_id: 'campaign-b',
          demographics: { region: 'emea', role: 'manager' },
          created_at: '2026-01-12T00:00:00.000Z',
        },
        {
          id: 'submission-3',
          invitation_id: null,
          campaign_id: 'campaign-a',
          demographics: { region: 'apac', role: 'ic' },
          created_at: '2025-12-20T00:00:00.000Z',
        },
      ],
    })

    const result = await resolveNormGroupSubmissionIds({
      adminClient: adminClient as never,
      assessmentId: 'assessment-1',
      filters: {
        campaign_ids: ['campaign-a'],
        created_at_from: '2026-01-01T00:00:00.000Z',
        demographics: { region: 'apac', role: 'manager' },
      },
    })

    expect(result).toEqual({
      ok: true,
      data: {
        submissionIds: ['submission-1'],
        filters: {
          campaign_ids: ['campaign-a'],
          cohort_ids: undefined,
          created_at_from: '2026-01-01T00:00:00.000Z',
          created_at_to: undefined,
          demographics: { region: 'apac', role: 'manager' },
        },
      },
    })

    const submissionTable = (adminClient.from as ReturnType<typeof vi.fn>).mock.results[0]?.value
    const selectCall = submissionTable?.select as ReturnType<typeof vi.fn>
    const eq = selectCall.mock.results[0]?.value.eq as ReturnType<typeof vi.fn>
    expect(eq).toHaveBeenNthCalledWith(1, 'assessment_id', 'assessment-1')
    expect(eq).toHaveBeenNthCalledWith(2, 'excluded_from_analysis', false)
  })

  it('filters submissions by cohort ids through invitations', async () => {
    const adminClient = makeAdminClient({
      submissions: [
        {
          id: 'submission-1',
          invitation_id: 'inv-1',
          campaign_id: 'campaign-a',
          demographics: { region: 'apac' },
          created_at: '2026-01-10T00:00:00.000Z',
        },
        {
          id: 'submission-2',
          invitation_id: 'inv-2',
          campaign_id: 'campaign-a',
          demographics: { region: 'emea' },
          created_at: '2026-01-11T00:00:00.000Z',
        },
      ],
      invitations: [
        { id: 'inv-1', cohort_id: 'cohort-a' },
        { id: 'inv-2', cohort_id: 'cohort-b' },
      ],
    })

    const result = await resolveNormGroupSubmissionIds({
      adminClient: adminClient as never,
      assessmentId: 'assessment-1',
      filters: {
        cohort_ids: ['cohort-b'],
        created_at_to: '2026-01-31T00:00:00.000Z',
      },
    })

    expect(result).toEqual({
      ok: true,
      data: {
        submissionIds: ['submission-2'],
        filters: {
          campaign_ids: undefined,
          cohort_ids: ['cohort-b'],
          created_at_from: undefined,
          created_at_to: '2026-01-31T00:00:00.000Z',
          demographics: undefined,
        },
      },
    })
  })
})
