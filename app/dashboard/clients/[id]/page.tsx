'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardKpiStrip } from '@/components/dashboard/ui/kpi-strip'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { getPublicSiteUrl } from '@/utils/public-site-url'
import { AssessmentAccessCard } from './_components/assessment-access-card'
import { AuditActivityCard } from './_components/audit-activity-card'
import { ClientDangerZone } from './_components/client-danger-zone'
import { InviteMemberCard } from './_components/invite-member-card'
import { MembersCard } from './_components/members-card'
import { PortalAccessCard } from './_components/portal-access-card'
import {
  attachErrorMessages,
  getActiveMembersCount,
  getAssignableAssessments,
  getEnabledAccessCount,
  inviteErrorMessages,
  loadClientWorkspace,
  type AccessRow,
  type Assessment,
  type AuditLog,
  type DeliveryMode,
  type InviteMode,
  type Member,
} from './_lib/client-detail'

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [organisationId, setOrganisationId] = useState('')
  const [orgName, setOrgName] = useState('Client')
  const [canLaunchPortal, setCanLaunchPortal] = useState(false)
  const [portalLaunchReason, setPortalLaunchReason] = useState<'available' | 'viewer_lacks_access' | 'organisation_unavailable'>('viewer_lacks_access')
  const [members, setMembers] = useState<Member[]>([])
  const [accessRows, setAccessRows] = useState<AccessRow[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Member['role']>('viewer')
  const [inviteMode, setInviteMode] = useState<InviteMode>('auto')
  const [attachEmail, setAttachEmail] = useState('')
  const [attachRole, setAttachRole] = useState<Member['role']>('viewer')
  const [selectedAssessment, setSelectedAssessment] = useState('')
  const [inviteWarning, setInviteWarning] = useState<string | null>(null)
  const [setupLink, setSetupLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [clientLoginCopied, setClientLoginCopied] = useState(false)
  const [inviteBusy, setInviteBusy] = useState(false)
  const [attachBusy, setAttachBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [attachError, setAttachError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    ;(async () => {
      const value = (await params).id
      if (mounted) {
        setOrganisationId(value)
      }
    })()

    return () => {
      mounted = false
    }
  }, [params])

  const load = useCallback(async () => {
    if (!organisationId) return

    const workspace = await loadClientWorkspace(organisationId)
    setOrgName(workspace.orgName)
    setCanLaunchPortal(workspace.canLaunchPortal)
    setPortalLaunchReason(workspace.portalLaunchReason)
    setMembers(workspace.members)
    setAccessRows(workspace.accessRows)
    setAssessments(workspace.assessments)
    setAuditLogs(workspace.auditLogs)
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

  const assignableAssessments = useMemo(() => getAssignableAssessments(assessments), [assessments])
  const clientLoginUrl = useMemo(() => `${getPublicSiteUrl()}/client-login`, [])

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!organisationId) return

    setInviteError(null)
    setInviteWarning(null)
    setSetupLink(null)
    setCopied(false)
    setInviteBusy(true)

    try {
      const response = await fetch(`/api/admin/organisations/${organisationId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole, mode: inviteMode }),
      })
      const body = (await response.json()) as {
        ok?: boolean
        error?: string
        message?: string
        warning?: string
        setup_link?: string
        delivery?: DeliveryMode
      }

      if (!response.ok || !body.ok) {
        const code = body.error ?? 'invite_failed'
        setInviteError(
          inviteErrorMessages[code] ?? body.message ?? body.error ?? 'Failed to invite member.'
        )
        return
      }

      if (body.warning) {
        setInviteWarning(body.warning)
      }
      if (body.setup_link) {
        setSetupLink(body.setup_link)
      }

      setInviteEmail('')
      await load()
    } finally {
      setInviteBusy(false)
    }
  }

  async function attachMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!organisationId) return

    setAttachError(null)
    setAttachBusy(true)

    try {
      const response = await fetch(`/api/admin/organisations/${organisationId}/members/attach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: attachEmail, role: attachRole }),
      })
      const body = (await response.json()) as {
        ok?: boolean
        error?: string
        message?: string
      }

      if (!response.ok || !body.ok) {
        const code = body.error ?? 'membership_attach_failed'
        setAttachError(
          attachErrorMessages[code] ?? body.message ?? body.error ?? 'Failed to attach user.'
        )
        return
      }

      setAttachEmail('')
      await load()
    } finally {
      setAttachBusy(false)
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

  async function copyClientLoginUrl() {
    try {
      await navigator.clipboard.writeText(clientLoginUrl)
      setClientLoginCopied(true)
      setTimeout(() => setClientLoginCopied(false), 1400)
    } catch {
      setClientLoginCopied(false)
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

    await fetch(`/api/admin/organisations/${organisationId}/members/${memberId}`, {
      method: 'DELETE',
    })
    await load()
  }

  async function assignAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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

  async function deleteClient() {
    if (!organisationId) return

    setDeleteBusy(true)
    setDeleteError(null)

    try {
      const response = await fetch(`/api/admin/organisations/${organisationId}`, {
        method: 'DELETE',
      })
      const body = (await response.json()) as { ok?: boolean; error?: string }

      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? 'delete_failed')
      }

      router.push('/dashboard/clients')
      router.refresh()
    } catch {
      setDeleteError('Could not delete this client. Please try again.')
      setDeleteBusy(false)
    }
  }

  if (!organisationId) {
    return <p className="text-sm text-[var(--admin-text-muted)]">Loading client...</p>
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="CRM"
        title={orgName}
        description="Manage client members, assessment access, and recent audit activity."
        actions={
          canLaunchPortal ? (
            <form
              action={`/api/admin/organisations/${organisationId}/portal-launch`}
              method="post"
              target="_blank"
            >
              <button
                type="submit"
                className="inline-flex rounded-full border border-[rgba(103,127,159,0.18)] bg-[rgba(255,255,255,0.82)] px-4 py-2 text-sm font-semibold text-[var(--admin-accent)] transition-colors hover:bg-[var(--admin-accent-soft)]"
              >
                View client portal
              </button>
            </form>
          ) : undefined
        }
      />

      <DashboardKpiStrip
        items={[
          { label: 'Members', value: members.length },
          { label: 'Active members', value: getActiveMembersCount(members) },
          { label: 'Enabled assessments', value: getEnabledAccessCount(accessRows) },
          { label: 'Recent audit events', value: auditLogs.length },
        ]}
      />

      <PortalAccessCard
        organisationId={organisationId}
        canLaunchPortal={canLaunchPortal}
        portalLaunchReason={portalLaunchReason}
      />

      <InviteMemberCard
        inviteEmail={inviteEmail}
        inviteRole={inviteRole}
        inviteMode={inviteMode}
        inviteBusy={inviteBusy}
        inviteError={inviteError}
        attachEmail={attachEmail}
        attachRole={attachRole}
        attachBusy={attachBusy}
        attachError={attachError}
        inviteWarning={inviteWarning}
        setupLink={setupLink}
        copied={copied}
        clientLoginUrl={clientLoginUrl}
        clientLoginCopied={clientLoginCopied}
        onInviteEmailChange={setInviteEmail}
        onInviteRoleChange={setInviteRole}
        onInviteModeChange={setInviteMode}
        onAttachEmailChange={setAttachEmail}
        onAttachRoleChange={setAttachRole}
        onInviteSubmit={inviteMember}
        onAttachSubmit={attachMember}
        onCopySetupLink={copySetupLink}
        onCopyClientLoginUrl={copyClientLoginUrl}
      />

      <MembersCard members={members} onUpdateMember={updateMember} onRemoveMember={removeMember} />

      <AssessmentAccessCard
        accessRows={accessRows}
        assignableAssessments={assignableAssessments}
        selectedAssessment={selectedAssessment}
        busy={busy}
        onSelectedAssessmentChange={setSelectedAssessment}
        onAssignAssessment={assignAssessment}
        onToggleAccess={toggleAccess}
        onRemoveAccess={removeAccess}
      />

      <AuditActivityCard auditLogs={auditLogs} />

      <ClientDangerZone
        organisationName={orgName}
        showDeleteConfirm={showDeleteConfirm}
        deleteConfirmName={deleteConfirmName}
        deleting={deleteBusy}
        deleteError={deleteError}
        onShowDeleteConfirm={() => {
          setShowDeleteConfirm(true)
          setDeleteError(null)
        }}
        onDeleteConfirmNameChange={setDeleteConfirmName}
        onDelete={deleteClient}
        onCancel={() => {
          setShowDeleteConfirm(false)
          setDeleteConfirmName('')
          setDeleteError(null)
        }}
      />
    </DashboardPageShell>
  )
}
