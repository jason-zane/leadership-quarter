import { describe, expect, it } from 'vitest'
import {
  getInvitationParticipantEmail,
  getInvitationParticipantName,
  getSubmissionParticipantEmail,
  getSubmissionParticipantName,
  getSubmissionParticipantOrganisation,
  getSubmissionParticipantRole,
  normalizeEmail,
  participantDisplayName,
  pickRelation,
} from '@/utils/services/participant-identity'

describe('participant identity helpers', () => {
  it('prefers submission values and falls back to invitation values', () => {
    const row = {
      first_name: 'Ada',
      last_name: null,
      email: null,
      organisation: '',
      role: 'Lead',
      assessment_invitations: {
        first_name: 'Ignored',
        last_name: 'Lovelace',
        email: 'ada@example.com',
        organisation: 'Analytical Engines',
        role: 'Ignored role',
      },
    }

    expect(getSubmissionParticipantName(row)).toBe('Ada Lovelace')
    expect(getSubmissionParticipantEmail(row)).toBe('ada@example.com')
    expect(getSubmissionParticipantOrganisation(row)).toBe('Analytical Engines')
    expect(getSubmissionParticipantRole(row)).toBe('Lead')
  })

  it('normalizes invitation-only identity values', () => {
    const invitation = {
      first_name: '  Mia ',
      last_name: ' Jones  ',
      email: 'MIA@example.com ',
    }

    expect(getInvitationParticipantName(invitation)).toBe('Mia Jones')
    expect(getInvitationParticipantEmail(invitation)).toBe('mia@example.com')
  })

  it('keeps relation picking and unknown-name fallback stable', () => {
    expect(pickRelation([{ email: 'a@example.com' }, { email: 'b@example.com' }])?.email).toBe('a@example.com')
    expect(pickRelation(null)).toBeNull()
    expect(normalizeEmail(' Test@Example.com ')).toBe('test@example.com')
    expect(participantDisplayName([null, ''])).toBe('Unknown participant')
  })
})
