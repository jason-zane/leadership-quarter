import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ensureAssessmentParticipant,
  updateAssessmentParticipantStatus,
} from '@/utils/services/assessment-participants'

function createParticipantClientMock(options?: {
  byContact?: unknown
  byEmail?: unknown
}) {
  const participantTable = {
    select: vi.fn((columns?: string) => {
      if (String(columns).includes('status')) {
        return {
          eq: vi.fn((field: string) => {
            if (field === 'contact_id') {
              return {
                maybeSingle: vi.fn().mockResolvedValue({
                  data: options?.byContact ?? null,
                  error: null,
                }),
              }
            }

            return {
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: options?.byEmail ?? null,
                    error: null,
                  }),
                }),
              }),
            }
          }),
        }
      }

      return {
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'participant-1', status: 'archived', archived_at: '2026-03-20T00:00:00.000Z' },
            error: null,
          }),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'participant-new', status: 'active' },
          error: null,
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  }

  const invitationsTable = {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  }

  const submissionsTable = {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === 'assessment_participants') return participantTable
      if (table === 'assessment_invitations') return invitationsTable
      if (table === 'assessment_submissions') return submissionsTable
      return {}
    }),
    participantTable,
    invitationsTable,
    submissionsTable,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ensureAssessmentParticipant', () => {
  it('merges an older email-only participant into the contact-backed participant', async () => {
    const client = createParticipantClientMock({
      byContact: {
        id: 'participant-contact',
        contact_id: 'contact-1',
        email: 'jason@example.com',
        first_name: 'Jason',
        last_name: 'Hunt',
        organisation: null,
        role: null,
        status: 'active',
      },
      byEmail: {
        id: 'participant-email',
        contact_id: null,
        email: 'jason@example.com',
        first_name: null,
        last_name: null,
        organisation: null,
        role: null,
        status: 'active',
      },
    })

    const result = await ensureAssessmentParticipant({
      client: client as never,
      contactId: 'contact-1',
      email: 'jason@example.com',
      firstName: 'Jason',
      lastName: 'Hunt',
    })

    expect(result).toEqual({
      data: { id: 'participant-contact', status: 'active' },
      error: null,
      missingTable: false,
    })
    expect(client.invitationsTable.update).toHaveBeenCalledWith({ participant_id: 'participant-contact' })
    expect(client.submissionsTable.update).toHaveBeenCalledWith({ participant_id: 'participant-contact' })
    expect(client.participantTable.delete).toHaveBeenCalled()
  })

  it('creates a participant when no existing contact or email record exists', async () => {
    const client = createParticipantClientMock()

    const result = await ensureAssessmentParticipant({
      client: client as never,
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
    })

    expect(result).toEqual({
      data: { id: 'participant-new', status: 'active' },
      error: null,
      missingTable: false,
    })
    expect(client.participantTable.insert).toHaveBeenCalled()
  })
})

describe('updateAssessmentParticipantStatus', () => {
  it('archives a participant record', async () => {
    const client = createParticipantClientMock()

    const result = await updateAssessmentParticipantStatus({
      client: client as never,
      participantId: 'participant-1',
      status: 'archived',
    })

    expect(result.ok).toBe(true)
    expect(client.participantTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'archived',
      })
    )
  })
})
