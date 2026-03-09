'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardKpiStrip } from '@/components/dashboard/ui/kpi-strip'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { AssessmentAccessCard } from './_components/assessment-access-card'
import { AuditActivityCard } from './_components/audit-activity-card'
import { InviteMemberCard } from './_components/invite-member-card'
import { MembersCard } from './_components/members-card'
import {
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
  const [organisationId, setOrganisationId] = useState('')
  const [orgName, setOrgName] = useState('Client')
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

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!organisationId) return

    setError(null)
    setInviteWarning(null)
    setSetupLink(null)
    setCopied(false)
    setBusy(true)

    try {
      const response = await fetch(`/api/admin/organisations/${organisationId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, mode: inviteMode }),
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

  if (!organisationId) {
    return <p className="text-sm text-[var(--admin-text-muted)]">Loading client...</p>
  }

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
          { label: 'Active members', value: getActiveMembersCount(members) },
          { label: 'Enabled assessments', value: getEnabledAccessCount(accessRows) },
          { label: 'Recent audit events', value: auditLogs.length },
        ]}
      />

      <InviteMemberCard
        email={email}
        role={role}
        inviteMode={inviteMode}
        busy={busy}
        error={error}
        inviteWarning={inviteWarning}
        setupLink={setupLink}
        copied={copied}
        onEmailChange={setEmail}
        onRoleChange={setRole}
        onInviteModeChange={setInviteMode}
        onSubmit={inviteMember}
        onCopySetupLink={copySetupLink}
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
    </DashboardPageShell>
  )
}
