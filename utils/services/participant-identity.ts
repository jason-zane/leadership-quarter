export type RelationValue<T> = T | T[] | null | undefined

export type InvitationIdentityFields = {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  organisation?: string | null
  role?: string | null
}

export type SubmissionIdentityFields = {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  organisation?: string | null
  role?: string | null
  assessment_invitations?: RelationValue<InvitationIdentityFields>
}

export function pickRelation<T>(value: RelationValue<T>): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export function normalizeText(value: string | null | undefined) {
  return (value ?? '').trim()
}

export function normalizeEmail(value: string | null | undefined) {
  return normalizeText(value).toLowerCase()
}

export function participantDisplayName(parts: Array<string | null | undefined>) {
  const value = parts.map((part) => normalizeText(part)).filter(Boolean).join(' ')
  return value || 'Unknown participant'
}

export function getSubmissionParticipantName<T extends SubmissionIdentityFields>(row: T) {
  const invitation = pickRelation(row.assessment_invitations)
  const firstName = normalizeText(row.first_name) || normalizeText(invitation?.first_name)
  const lastName = normalizeText(row.last_name) || normalizeText(invitation?.last_name)
  return participantDisplayName([firstName, lastName])
}

export function getSubmissionParticipantEmail<T extends SubmissionIdentityFields>(row: T) {
  const invitation = pickRelation(row.assessment_invitations)
  return normalizeEmail(row.email) || normalizeEmail(invitation?.email)
}

export function getSubmissionParticipantOrganisation<T extends SubmissionIdentityFields>(row: T) {
  const invitation = pickRelation(row.assessment_invitations)
  return normalizeText(row.organisation) || normalizeText(invitation?.organisation) || null
}

export function getSubmissionParticipantRole<T extends SubmissionIdentityFields>(row: T) {
  const invitation = pickRelation(row.assessment_invitations)
  return normalizeText(row.role) || normalizeText(invitation?.role) || null
}

export function getInvitationParticipantEmail<T extends InvitationIdentityFields>(row: T) {
  return normalizeEmail(row.email)
}

export function getInvitationParticipantName<T extends InvitationIdentityFields>(row: T) {
  return participantDisplayName([row.first_name, row.last_name])
}
