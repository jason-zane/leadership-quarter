import { describe, expect, it } from 'vitest'
import { buildAdminAssessmentParticipants } from '@/utils/services/admin-assessment-participants'

describe('buildAdminAssessmentParticipants', () => {
  it('groups multiple assessment submissions by contact id', () => {
    const participants = buildAdminAssessmentParticipants({
      submissions: [
        {
          id: 'sub-1',
          assessment_id: 'assess-1',
          campaign_id: 'camp-1',
          invitation_id: 'invite-1',
          participant_id: null,
          contact_id: 'contact-1',
          first_name: 'Ava',
          last_name: 'Stone',
          email: 'ava@example.com',
          organisation: 'Acme',
          role: 'Leader',
          demographics: null,
          created_at: '2026-03-10T10:00:00.000Z',
          assessments: { id: 'assess-1', key: 'ai', name: 'AI Readiness' },
          campaigns: { id: 'camp-1', name: 'Pilot', slug: 'pilot' },
          assessment_invitations: {
            id: 'invite-1',
            contact_id: 'contact-1',
            status: 'completed',
            completed_at: '2026-03-10T10:00:00.000Z',
            first_name: 'Ava',
            last_name: 'Stone',
            email: 'ava@example.com',
            organisation: 'Acme',
            role: 'Leader',
          },
        },
        {
          id: 'sub-2',
          assessment_id: 'assess-2',
          campaign_id: 'camp-1',
          invitation_id: 'invite-2',
          participant_id: null,
          contact_id: 'contact-1',
          first_name: 'Ava',
          last_name: 'Stone',
          email: 'ava@example.com',
          organisation: 'Acme',
          role: 'Leader',
          demographics: null,
          created_at: '2026-03-12T10:00:00.000Z',
          assessments: { id: 'assess-2', key: 'lq', name: 'Leadership Quotient' },
          campaigns: { id: 'camp-1', name: 'Pilot', slug: 'pilot' },
          assessment_invitations: {
            id: 'invite-2',
            contact_id: 'contact-1',
            status: 'completed',
            completed_at: '2026-03-12T10:00:00.000Z',
            first_name: 'Ava',
            last_name: 'Stone',
            email: 'ava@example.com',
            organisation: 'Acme',
            role: 'Leader',
          },
        },
      ],
      invitations: [],
    })

    expect(participants.size).toBe(1)
    const participant = participants.get('contact:contact-1')
    expect(participant).toBeDefined()
    expect(participant?.submissions).toHaveLength(2)
    expect(participant?.participantName).toBe('Ava Stone')
  })

  it('falls back to normalized email when there is no contact id', () => {
    const participants = buildAdminAssessmentParticipants({
      submissions: [
        {
          id: 'sub-1',
          assessment_id: 'assess-1',
          campaign_id: null,
          invitation_id: null,
          participant_id: null,
          contact_id: null,
          first_name: 'Mia',
          last_name: 'Jones',
          email: 'MIA@example.com',
          organisation: null,
          role: null,
          demographics: null,
          created_at: '2026-03-10T10:00:00.000Z',
          assessments: { id: 'assess-1', key: 'ai', name: 'AI Readiness' },
          campaigns: null,
          assessment_invitations: null,
        },
      ],
      invitations: [
        {
          id: 'invite-1',
          assessment_id: 'assess-2',
          campaign_id: null,
          participant_id: null,
          contact_id: null,
          first_name: 'Mia',
          last_name: 'Jones',
          email: 'mia@example.com',
          organisation: null,
          role: null,
          status: 'pending',
          completed_at: null,
          created_at: '2026-03-11T10:00:00.000Z',
          expires_at: null,
          assessments: { id: 'assess-2', key: 'lq', name: 'Leadership Quotient' },
          campaigns: null,
        },
      ],
    })

    expect(participants.size).toBe(1)
    const participant = participants.get('email:mia@example.com')
    expect(participant).toBeDefined()
    expect(participant?.submissions).toHaveLength(1)
    expect(participant?.invitations).toHaveLength(1)
  })

  it('keeps orphan records distinct when no contact id or email exists', () => {
    const participants = buildAdminAssessmentParticipants({
      submissions: [
        {
          id: 'sub-1',
          assessment_id: 'assess-1',
          campaign_id: null,
          invitation_id: null,
          participant_id: null,
          contact_id: null,
          first_name: null,
          last_name: null,
          email: null,
          organisation: null,
          role: null,
          demographics: null,
          created_at: '2026-03-10T10:00:00.000Z',
          assessments: { id: 'assess-1', key: 'ai', name: 'AI Readiness' },
          campaigns: null,
          assessment_invitations: null,
        },
      ],
      invitations: [
        {
          id: 'invite-1',
          assessment_id: 'assess-2',
          campaign_id: null,
          participant_id: null,
          contact_id: null,
          first_name: null,
          last_name: null,
          email: null,
          organisation: null,
          role: null,
          status: 'pending',
          completed_at: null,
          created_at: '2026-03-11T10:00:00.000Z',
          expires_at: null,
          assessments: { id: 'assess-2', key: 'lq', name: 'Leadership Quotient' },
          campaigns: null,
        },
      ],
    })

    expect(participants.size).toBe(2)
    expect(participants.has('orphan:sub-1')).toBe(true)
    expect(participants.has('orphan:invite-1')).toBe(true)
  })
})
