export type Member = {
  id: string
  user_id: string
  role: 'org_owner' | 'org_admin' | 'campaign_manager' | 'viewer'
  status: 'invited' | 'active' | 'suspended'
  email?: string | null
  invited_at: string
  accepted_at?: string | null
}

export type InviteMode = 'auto' | 'email' | 'manual_link'
export type DeliveryMode = 'email' | 'manual_link' | 'auto_fallback'

export type AccessRow = {
  id: string
  assessment_id: string
  enabled: boolean
  assessments?: { id: string; key: string; name: string; status: string } | null
}

export type Assessment = {
  id: string
  key: string
  name: string
  status: string
}

export type AuditLog = {
  id: string
  action: string
  actor_user_id: string
  target_user_id: string | null
  target_email: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export type ClientWorkspaceData = {
  orgName: string
  members: Member[]
  accessRows: AccessRow[]
  assessments: Assessment[]
  auditLogs: AuditLog[]
}

export const roleOptions: Member['role'][] = ['org_owner', 'org_admin', 'campaign_manager', 'viewer']
export const memberStatusOptions: Member['status'][] = ['invited', 'active', 'suspended']

export const inviteErrorMessages: Record<string, string> = {
  invalid_payload: 'Please provide a valid email and role.',
  site_url_not_configured:
    'Invite redirect URL is not configured. Set NEXT_PUBLIC_SITE_URL/PORTAL_BASE_URL.',
  invite_redirect_not_allowed:
    'Supabase blocked the invite redirect URL. Add the public set-password URL in Auth URL settings.',
  invite_email_provider_failed: 'Invite email provider failed. Check SMTP/provider configuration.',
  invite_user_already_exists:
    'User already exists but could not be linked automatically. Try inviting from Users first.',
  membership_upsert_failed: 'Could not create organisation membership row.',
  user_lookup_failed: 'Could not resolve invited user id from Supabase.',
  invite_failed: 'Supabase invite request failed.',
  user_create_failed: 'Could not create auth user for manual link flow.',
  setup_link_generation_failed: 'Could not generate setup link for this user.',
}

export function resolveAccessAssessment(row: AccessRow) {
  const relation = row.assessments as unknown
  return (Array.isArray(relation) ? relation[0] : relation) as
    | { id: string; key: string; name: string; status: string }
    | null
}

export function getAssignableAssessments(assessments: Assessment[]) {
  return assessments.filter((assessment) => assessment.status === 'active')
}

export function getActiveMembersCount(members: Member[]) {
  return members.filter((member) => member.status === 'active').length
}

export function getEnabledAccessCount(accessRows: AccessRow[]) {
  return accessRows.filter((row) => row.enabled).length
}

export async function loadClientWorkspace(organisationId: string): Promise<ClientWorkspaceData> {
  const [orgRes, membersRes, accessRes, assessmentsRes, auditRes] = await Promise.all([
    fetch(`/api/admin/organisations/${organisationId}`, { cache: 'no-store' }),
    fetch(`/api/admin/organisations/${organisationId}/members`, { cache: 'no-store' }),
    fetch(`/api/admin/organisations/${organisationId}/assessment-access`, { cache: 'no-store' }),
    fetch('/api/admin/assessments', { cache: 'no-store' }),
    fetch(`/api/admin/organisations/${organisationId}/audit-logs?pageSize=25`, { cache: 'no-store' }),
  ])

  const orgBody = (await orgRes.json()) as { organisation?: { name?: string }; ok?: boolean }
  const membersBody = (await membersRes.json()) as { members?: Member[] }
  const accessBody = (await accessRes.json()) as { access?: AccessRow[] }
  const assessmentsBody = (await assessmentsRes.json()) as { assessments?: Assessment[] }
  const auditBody = (await auditRes.json()) as { logs?: AuditLog[] }

  return {
    orgName: orgBody.organisation?.name ?? 'Client',
    members: membersBody.members ?? [],
    accessRows: accessBody.access ?? [],
    assessments: assessmentsBody.assessments ?? [],
    auditLogs: auditBody.logs ?? [],
  }
}
