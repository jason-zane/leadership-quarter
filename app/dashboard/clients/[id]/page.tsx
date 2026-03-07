'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationInput, FoundationSelect } from '@/components/ui/foundation/field'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardKpiStrip } from '@/components/dashboard/ui/kpi-strip'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import { RelativeTime } from '@/components/ui/relative-time'

type Member = {
  id: string
  user_id: string
  role: 'org_owner' | 'org_admin' | 'campaign_manager' | 'viewer'
  status: 'invited' | 'active' | 'suspended'
  email?: string | null
  invited_at: string
  accepted_at?: string | null
}

type InviteMode = 'auto' | 'email' | 'manual_link'
type DeliveryMode = 'email' | 'manual_link' | 'auto_fallback'

type AccessRow = {
  id: string
  assessment_id: string
  enabled: boolean
  assessments?: { id: string; key: string; name: string; status: string } | null
}

type Assessment = {
  id: string
  key: string
  name: string
  status: string
}

type AuditLog = {
  id: string
  action: string
  actor_user_id: string
  target_user_id: string | null
  target_email: string | null
  details: Record<string, unknown> | null
  created_at: string
}

const roleOptions: Member['role'][] = ['org_owner', 'org_admin', 'campaign_manager', 'viewer']
const memberStatusOptions: Member['status'][] = ['invited', 'active', 'suspended']
const inviteErrorMessages: Record<string, string> = {
  invalid_payload: 'Please provide a valid email and role.',
  site_url_not_configured: 'Invite redirect URL is not configured. Set NEXT_PUBLIC_SITE_URL/PORTAL_BASE_URL.',
  invite_redirect_not_allowed: 'Supabase blocked the invite redirect URL. Add the portal set-password URL in Auth URL settings.',
  invite_email_provider_failed: 'Invite email provider failed. Check SMTP/provider configuration.',
  invite_user_already_exists: 'User already exists but could not be linked automatically. Try inviting from Users first.',
  membership_upsert_failed: 'Could not create organisation membership row.',
  user_lookup_failed: 'Could not resolve invited user id from Supabase.',
  invite_failed: 'Supabase invite request failed.',
  user_create_failed: 'Could not create auth user for manual link flow.',
  setup_link_generation_failed: 'Could not generate setup link for this user.',
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [organisationId, setOrganisationId] = useState<string>('')
  const [orgName, setOrgName] = useState<string>('Client')
  const [members, setMembers] = useState<Member[]>([])
  const [accessRows, setAccessRows] = useState<AccessRow[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Member['role']>('viewer')
  const [inviteMode, setInviteMode] = useState<InviteMode>('auto')
  const [selectedAssessment, setSelectedAssessment] = useState('')
  const [inviteWarning, setInviteWarning] = useState<string | null>(null)
  const [setupLink, setSetupLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const value = (await params).id
      if (mounted) setOrganisationId(value)
    })()
    return () => {
      mounted = false
    }
  }, [params])

  const load = useCallback(async () => {
    if (!organisationId) return
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

    setOrgName(orgBody.organisation?.name ?? 'Client')
    setMembers(membersBody.members ?? [])
    setAccessRows(accessBody.access ?? [])
    setAssessments(assessmentsBody.assessments ?? [])
    setAuditLogs(auditBody.logs ?? [])
  }, [organisationId])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!organisationId || !mounted) return
      await load()
    })()
    return () => {
      mounted = false
    }
  }, [organisationId, load])

  const assignableAssessments = useMemo(
    () => assessments.filter((item) => item.status === 'active'),
    [assessments]
  )

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault()
    if (!organisationId) return
    setError(null)
    setInviteWarning(null)
    setSetupLink(null)
    setCopied(false)
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/organisations/${organisationId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, mode: inviteMode }),
      })
      const body = (await res.json()) as {
        ok?: boolean
        error?: string
        message?: string
        warning?: string
        setup_link?: string
        delivery?: DeliveryMode
      }
      if (!res.ok || !body.ok) {
        const code = body.error ?? 'invite_failed'
        setError(inviteErrorMessages[code] ?? body.message ?? body.error ?? 'Failed to invite member.')
        return
      }
      if (body.warning) {
        setInviteWarning(body.warning)
      }
      if (body.setup_link) {
        setSetupLink(body.setup_link)
      }
      setEmail('')
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function copySetupLink() {
    if (!setupLink) return
    try {
      await navigator.clipboard.writeText(setupLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  async function updateMember(memberId: string, patch: Partial<Pick<Member, 'role' | 'status'>>) {
    if (!organisationId) return
    await fetch(`/api/admin/organisations/${organisationId}/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    await load()
  }

  async function removeMember(memberId: string) {
    if (!organisationId) return
    await fetch(`/api/admin/organisations/${organisationId}/members/${memberId}`, { method: 'DELETE' })
    await load()
  }

  async function assignAssessment(e: React.FormEvent) {
    e.preventDefault()
    if (!organisationId || !selectedAssessment) return
    setBusy(true)
    try {
      await fetch(`/api/admin/organisations/${organisationId}/assessment-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment_id: selectedAssessment, enabled: true }),
      })
      setSelectedAssessment('')
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function toggleAccess(accessId: string, enabled: boolean) {
    if (!organisationId) return
    await fetch(`/api/admin/organisations/${organisationId}/assessment-access/${accessId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    await load()
  }

  async function removeAccess(accessId: string) {
    if (!organisationId) return
    await fetch(`/api/admin/organisations/${organisationId}/assessment-access/${accessId}`, {
      method: 'DELETE',
    })
    await load()
  }

  if (!organisationId) {
    return <p className="text-sm text-[var(--admin-text-muted)]">Loading client...</p>
  }

  const activeMembersCount = members.filter((member) => member.status === 'active').length
  const enabledAccessCount = accessRows.filter((row) => row.enabled).length

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="CRM"
        title={orgName}
        description="Manage client members, assessment access, and recent audit activity."
      />

      <DashboardKpiStrip
        items={[
          { label: 'Members', value: members.length },
          { label: 'Active members', value: activeMembersCount },
          { label: 'Enabled assessments', value: enabledAccessCount },
          { label: 'Recent audit events', value: auditLogs.length },
        ]}
      />

      <FoundationSurface className="space-y-4 p-5">
        <h2 className="text-sm font-semibold text-[var(--admin-text-primary)]">Invite member</h2>
        <form onSubmit={inviteMember} className="grid gap-3 md:grid-cols-4">
          <FoundationInput
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@client.com"
            type="email"
            required
          />
          <FoundationSelect
            value={role}
            onChange={(e) => setRole(e.target.value as Member['role'])}
          >
            {roleOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </FoundationSelect>
          <FoundationSelect
            value={inviteMode}
            onChange={(e) => setInviteMode(e.target.value as InviteMode)}
          >
            <option value="auto">Auto (recommended)</option>
            <option value="email">Email only</option>
            <option value="manual_link">Manual setup link</option>
          </FoundationSelect>
          <FoundationButton type="submit" variant="primary" disabled={busy}>
            {busy ? 'Inviting...' : 'Invite'}
          </FoundationButton>
        </form>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {inviteWarning ? <p className="text-sm text-amber-700">{inviteWarning}</p> : null}
        {setupLink ? (
          <div className="space-y-2 rounded-xl border border-[var(--admin-border)] bg-[rgba(255,255,255,0.72)] p-3">
            <p className="text-xs font-medium text-[var(--admin-text-primary)]">
              Setup link (share manually with this member)
            </p>
            <p className="break-all rounded bg-white p-2 font-mono text-xs text-[var(--admin-text-muted)]">
              {setupLink}
            </p>
            <FoundationButton type="button" size="sm" variant="secondary" onClick={() => void copySetupLink()}>
              {copied ? 'Copied' : 'Copy setup link'}
            </FoundationButton>
          </div>
        ) : null}
      </FoundationSurface>

      <FoundationSurface className="space-y-3 p-5">
        <h2 className="text-sm font-semibold text-[var(--admin-text-primary)]">Members</h2>
        <DashboardDataTableShell>
          <table className="w-full text-left text-sm">
            <thead className="bg-[rgba(255,255,255,0.68)] text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
              <tr>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Invited</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-[var(--admin-text-muted)]">
                    No members yet.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="border-t border-[rgba(103,127,159,0.12)]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--admin-text-primary)]">{member.email ?? member.user_id}</p>
                      <p className="text-xs text-[var(--admin-text-muted)]">{member.user_id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <FoundationSelect
                        value={member.role}
                        onChange={(e) => void updateMember(member.id, { role: e.target.value as Member['role'] })}
                        className="h-9 text-xs"
                      >
                        {roleOptions.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </FoundationSelect>
                    </td>
                    <td className="px-4 py-3">
                      <FoundationSelect
                        value={member.status}
                        onChange={(e) =>
                          void updateMember(member.id, {
                            status: e.target.value as Member['status'],
                          })
                        }
                        className="h-9 text-xs"
                      >
                        {memberStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </FoundationSelect>
                    </td>
                    <td className="px-4 py-3 text-[var(--admin-text-muted)]">
                      <RelativeTime date={member.invited_at} />
                    </td>
                    <td className="px-4 py-3">
                      <FoundationButton
                        type="button"
                        size="sm"
                        variant="danger"
                        onClick={() => void removeMember(member.id)}
                      >
                        Remove
                      </FoundationButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DashboardDataTableShell>
      </FoundationSurface>

      <FoundationSurface className="space-y-3 p-5">
        <h2 className="text-sm font-semibold text-[var(--admin-text-primary)]">Assigned assessments</h2>
        <form onSubmit={assignAssessment} className="flex flex-wrap gap-3">
          <FoundationSelect
            value={selectedAssessment}
            onChange={(e) => setSelectedAssessment(e.target.value)}
          >
            <option value="">Select assessment</option>
            {assignableAssessments.map((assessment) => (
              <option key={assessment.id} value={assessment.id}>
                {assessment.name} ({assessment.key})
              </option>
            ))}
          </FoundationSelect>
          <FoundationButton type="submit" variant="primary" disabled={!selectedAssessment || busy}>
            Assign
          </FoundationButton>
        </form>

        <DashboardDataTableShell>
          <table className="w-full text-left text-sm">
            <thead className="bg-[rgba(255,255,255,0.68)] text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
              <tr>
                <th className="px-4 py-3">Assessment</th>
                <th className="px-4 py-3">Enabled</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accessRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-[var(--admin-text-muted)]">
                    No assessment access rows yet.
                  </td>
                </tr>
              ) : (
                accessRows.map((row) => {
                  const rel = row.assessments as unknown
                  const assessment = (Array.isArray(rel) ? rel[0] : rel) as
                    | { id: string; key: string; name: string; status: string }
                    | null

                  return (
                    <tr key={row.id} className="border-t border-[rgba(103,127,159,0.12)]">
                      <td className="px-4 py-3 text-[var(--admin-text-primary)]">
                        {assessment ? `${assessment.name} (${assessment.key})` : row.assessment_id}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={row.enabled}
                          onChange={(e) => void toggleAccess(row.id, e.target.checked)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <FoundationButton
                          type="button"
                          size="sm"
                          variant="danger"
                          onClick={() => void removeAccess(row.id)}
                        >
                          Remove
                        </FoundationButton>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </DashboardDataTableShell>
      </FoundationSurface>

      <FoundationSurface className="space-y-3 p-5">
        <h2 className="text-sm font-semibold text-[var(--admin-text-primary)]">Audit activity</h2>
        <DashboardDataTableShell>
          <table className="w-full text-left text-sm">
            <thead className="bg-[rgba(255,255,255,0.68)] text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Target</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--admin-text-muted)]">
                    No audit activity yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="border-t border-[rgba(103,127,159,0.12)]">
                    <td className="px-4 py-3 text-[var(--admin-text-muted)]">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--admin-text-primary)]">{log.action}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--admin-text-muted)]">{log.actor_user_id}</td>
                    <td className="px-4 py-3 text-[var(--admin-text-muted)]">{log.target_email ?? log.target_user_id ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DashboardDataTableShell>
      </FoundationSurface>
    </DashboardPageShell>
  )
}
