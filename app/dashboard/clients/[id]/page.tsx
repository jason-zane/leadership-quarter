'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardKpiStrip } from '@/components/dashboard/ui/kpi-strip'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { getPublicSiteUrl } from '@/utils/public-site-url'
import { AssessmentAccessCard } from './_components/assessment-access-card'
import { OrgBrandingCard } from './_components/org-branding-card'
import { normalizeOrgBrandingConfig } from '@/utils/brand/org-brand-utils'
import { AuditActivityCard } from './_components/audit-activity-card'
import { ClientDangerZone } from './_components/client-danger-zone'
import { InviteMemberCard } from './_components/invite-member-card'
import { MembersCard } from './_components/members-card'
import { PortalAccessCard } from './_components/portal-access-card'
import { ClientTabBar, type ClientTab } from './_components/client-tab-bar'
import { ClientCampaignsCard } from './_components/client-campaigns-card'
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
  const searchParams = useSearchParams()
  const [organisationId, setOrganisationId] = useState('')
  const [orgName, setOrgName] = useState('Client')
  const [brandingConfig, setBrandingConfig] = useState(() => normalizeOrgBrandingConfig(null))
  const [viewerUserId, setViewerUserId] = useState<string | null>(null)
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
  const [addSelfBusy, setAddSelfBusy] = useState(false)
  const [addSelfError, setAddSelfError] = useState<string | null>(null)
  const [campaignsVisited, setCampaignsVisited] = useState(false)

  const validTabs: ClientTab[] = ['members', 'assessments', 'branding', 'campaigns', 'audit']
  const rawTab = searchParams.get('tab') ?? 'members'
  const [activeTab, setActiveTab] = useState<ClientTab>(
    validTabs.includes(rawTab as ClientTab) ? (rawTab as ClientTab) : 'members'
  )

  function handleTabChange(tab: ClientTab) {
    setActiveTab(tab)
    if (tab === 'campaigns') setCampaignsVisited(true)
    history.replaceState(null, '', `?tab=${tab}`)
  }

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
    setBrandingConfig(normalizeOrgBrandingConfig(workspace.brandingConfig))
    setViewerUserId(workspace.viewerUserId)
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
  const created = searchParams.get('created') === '1'
  const hasMembers = members.some((member) => member.status === 'invited' || member.status === 'active')
  const setupMode = !hasMembers
  const viewerMembership = viewerUserId
    ? members.find((member) => member.user_id === viewerUserId)
    : null
  const canAddSelf = Boolean(viewerUserId) && !viewerMembership

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

  async function addSelfAsMember() {
    if (!organisationId || !viewerUserId) return

    setAddSelfError(null)
    setAddSelfBusy(true)
    try {
      const response = await fetch(`/api/admin/organisations/${organisationId}/members/attach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: viewerUserId, role: 'org_owner' }),
      })
      const body = (await response.json()) as { ok?: boolean; error?: string; message?: string }
      if (!response.ok || !body.ok) {
        setAddSelfError(body.message ?? body.error ?? 'Could not add your account to this client.')
        return
      }

      await load()
    } finally {
      setAddSelfBusy(false)
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

  async function updateQuota(accessId: string, quota: number | null) {
    if (!organisationId) return

    await fetch(`/api/admin/organisations/${organisationId}/assessment-access/${accessId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessment_quota: quota }),
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

      <ClientTabBar activeTab={activeTab} onTabChange={handleTabChange} />

      {activeTab === 'members' && (
        <>
          {setupMode ? (
            <div className="rounded-2xl border border-[rgba(103,127,159,0.2)] bg-[rgba(240,246,255,0.75)] p-4 text-sm text-[var(--admin-text-primary)]">
              {created ? (
                <p className="font-medium">Client created. Next step: add the first client users below.</p>
              ) : (
                <p className="font-medium">This client has no users yet. Add the first client users below.</p>
              )}
              <p className="mt-1 text-[var(--admin-text-muted)]">
                Internal Leadership Quarter admins can still open this client via portal launch. Client
                membership is optional for internal admins.
              </p>
              {canAddSelf ? (
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      void addSelfAsMember()
                    }}
                    disabled={addSelfBusy}
                    className="inline-flex rounded-full border border-[rgba(103,127,159,0.18)] bg-white px-4 py-2 text-xs font-semibold text-[var(--admin-accent)] transition-colors hover:bg-[var(--admin-accent-soft)] disabled:opacity-70"
                  >
                    {addSelfBusy ? 'Adding you...' : 'Add me as client owner'}
                  </button>
                  {addSelfError ? (
                    <p className="text-xs text-red-600">{addSelfError}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {!canLaunchPortal && (
            <PortalAccessCard
              organisationId={organisationId}
              canLaunchPortal={canLaunchPortal}
              portalLaunchReason={portalLaunchReason}
            />
          )}

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
        </>
      )}

      {activeTab === 'assessments' && (
        <AssessmentAccessCard
          accessRows={accessRows}
          assignableAssessments={assignableAssessments}
          selectedAssessment={selectedAssessment}
          busy={busy}
          onSelectedAssessmentChange={setSelectedAssessment}
          onAssignAssessment={assignAssessment}
          onToggleAccess={toggleAccess}
          onRemoveAccess={removeAccess}
          onUpdateQuota={updateQuota}
        />
      )}

      {activeTab === 'branding' && organisationId && (
        <OrgBrandingCard
          organisationId={organisationId}
          initialBranding={brandingConfig}
        />
      )}

      {(activeTab === 'campaigns' || campaignsVisited) && organisationId && (
        <div className={activeTab === 'campaigns' ? undefined : 'hidden'}>
          <ClientCampaignsCard organisationId={organisationId} />
        </div>
      )}

      {activeTab === 'audit' && (
        <AuditActivityCard auditLogs={auditLogs} />
      )}
    </DashboardPageShell>
  )
}
