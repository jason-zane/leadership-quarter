'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type Member = {
  id: string
  user_id: string
  role: 'org_owner' | 'org_admin' | 'campaign_manager' | 'viewer'
  status: 'invited' | 'active' | 'suspended'
  email?: string | null
  invited_at: string
  accepted_at?: string | null
}

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

export default function OrganisationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [organisationId, setOrganisationId] = useState<string>('')
  const [orgName, setOrgName] = useState<string>('Organisation')
  const [members, setMembers] = useState<Member[]>([])
  const [accessRows, setAccessRows] = useState<AccessRow[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Member['role']>('viewer')
  const [selectedAssessment, setSelectedAssessment] = useState('')
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

    setOrgName(orgBody.organisation?.name ?? 'Organisation')
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
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/organisations/${organisationId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      const body = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !body.ok) {
        setError(body.error ?? 'Failed to invite member.')
        return
      }
      setEmail('')
      await load()
    } finally {
      setBusy(false)
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
    return <div className="text-sm text-zinc-500">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{orgName}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage organisation members and assigned assessments.</p>
      </div>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Invite member</h2>
        <form onSubmit={inviteMember} className="grid gap-3 md:grid-cols-4">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@client.com"
            type="email"
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Member['role'])}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            {roleOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            {busy ? 'Inviting...' : 'Invite'}
          </button>
        </form>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Members</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                <th className="py-2">Email</th>
                <th className="py-2">Role</th>
                <th className="py-2">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="py-2">{member.email ?? member.user_id}</td>
                  <td className="py-2">
                    <select
                      value={member.role}
                      onChange={(e) => void updateMember(member.id, { role: e.target.value as Member['role'] })}
                      className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      {roleOptions.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2">
                    <select
                      value={member.status}
                      onChange={(e) =>
                        void updateMember(member.id, {
                          status: e.target.value as Member['status'],
                        })
                      }
                      className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      <option value="invited">invited</option>
                      <option value="active">active</option>
                      <option value="suspended">suspended</option>
                    </select>
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => void removeMember(member.id)}
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Assigned assessments</h2>
        <form onSubmit={assignAssessment} className="flex flex-wrap gap-3">
          <select
            value={selectedAssessment}
            onChange={(e) => setSelectedAssessment(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="">Select assessment</option>
            {assignableAssessments.map((assessment) => (
              <option key={assessment.id} value={assessment.id}>
                {assessment.name} ({assessment.key})
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!selectedAssessment || busy}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Assign
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                <th className="py-2">Assessment</th>
                <th className="py-2">Enabled</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accessRows.map((row) => {
                const rel = row.assessments as unknown
                const assessment = (Array.isArray(rel) ? rel[0] : rel) as
                  | { id: string; key: string; name: string; status: string }
                  | null

                return (
                  <tr key={row.id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="py-2">
                      {assessment ? `${assessment.name} (${assessment.key})` : row.assessment_id}
                    </td>
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={(e) => void toggleAccess(row.id, e.target.checked)}
                      />
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => void removeAccess(row.id)}
                        className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Audit activity</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                <th className="py-2">When</th>
                <th className="py-2">Action</th>
                <th className="py-2">Actor</th>
                <th className="py-2">Target</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-zinc-500">
                    No audit activity yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="py-2 text-zinc-500">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="py-2 font-mono text-xs">{log.action}</td>
                    <td className="py-2 font-mono text-xs text-zinc-500">{log.actor_user_id}</td>
                    <td className="py-2 text-zinc-500">{log.target_email ?? log.target_user_id ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
