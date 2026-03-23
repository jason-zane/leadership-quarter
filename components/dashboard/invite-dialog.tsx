'use client'

import { useMemo, useState } from 'react'

type Props = {
  assessmentId?: string
  assessments?: Array<{ id: string; name: string }>
  campaignId?: string
  onInvited?: () => void
}

type InviteRow = {
  email: string
  first_name?: string
  last_name?: string
  organisation?: string
  role?: string
}

function parseRows(input: string): InviteRow[] {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [email, firstName, lastName, organisation, role] = line.split(',').map((item) => item.trim())
      return {
        email: email?.toLowerCase() ?? '',
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        organisation: organisation || undefined,
        role: role || undefined,
      }
    })
    .filter((row) => row.email.includes('@'))
}

export function InviteDialog({ assessmentId, assessments, campaignId, onInvited }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(assessments?.[0]?.id ?? '')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [role, setRole] = useState('')
  const [bulkRows, setBulkRows] = useState('')
  const [sendNow, setSendNow] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [mode, setMode] = useState<'single' | 'bulk'>('single')

  const activeSurveyId = assessmentId ?? selectedSurveyId
  const parsedBulk = useMemo(() => parseRows(bulkRows), [bulkRows])
  const bulkNonEmptyLines = useMemo(
    () => bulkRows.split('\n').map((line) => line.trim()).filter(Boolean).length,
    [bulkRows]
  )
  const bulkIgnored = Math.max(0, bulkNonEmptyLines - parsedBulk.length)
  const bulkCountLabel = parsedBulk.length === 1 ? '1 invite' : `${parsedBulk.length} invites`

  function reset() {
    setSelectedSurveyId(assessments?.[0]?.id ?? '')
    setEmail('')
    setFirstName('')
    setLastName('')
    setOrganisation('')
    setRole('')
    setBulkRows('')
    setSendNow(true)
    setError(null)
    setSuccess(false)
    setMode('single')
  }

  function handleClose() {
    setOpen(false)
    reset()
  }

  async function submitInvites(invitations: InviteRow[]) {
    if (!campaignId && !activeSurveyId) {
      setError('Please select an assessment.')
      return
    }
    if (invitations.length === 0) {
      setError('Add at least one valid invitation.')
      return
    }

    const endpoint = campaignId
      ? `/api/admin/campaigns/${campaignId}/invitations`
      : `/api/admin/assessments/${activeSurveyId}/invitations`

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          send_now: sendNow,
          invitations,
        }),
      })
      const body = (await res.json()) as { ok: boolean; error?: string; message?: string }
      if (!res.ok || !body.ok) {
        setError(body.message ?? body.error ?? 'Failed to create invitations.')
      } else {
        setSuccess(true)
        onInvited?.()
        setTimeout(() => handleClose(), 1200)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'single') {
      await submitInvites([
        {
          email: email.trim().toLowerCase(),
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined,
          organisation: organisation.trim() || undefined,
          role: role.trim() || undefined,
        },
      ])
      return
    }

    await submitInvites(parsedBulk)
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="foundation-btn foundation-btn-secondary px-3 py-2 text-sm">
        Invite participants
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-solid)] p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-[var(--admin-text-primary)]">Invite participants</h2>
                <p className="text-sm text-[var(--admin-text-muted)]">Add a single invite or paste a bulk list.</p>
              </div>
              <button onClick={handleClose} className="text-sm text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)]">
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!campaignId && assessments && assessments.length > 0 ? (
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Assessment</span>
                  <select value={selectedSurveyId} onChange={(e) => setSelectedSurveyId(e.target.value)} required className="foundation-field">
                    {assessments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="backend-tab-bar">
                <button
                  type="button"
                  onClick={() => setMode('single')}
                  className={['backend-tab-link', mode === 'single' ? 'backend-tab-link-active' : ''].join(' ')}
                >
                  Single invite
                </button>
                <button
                  type="button"
                  onClick={() => setMode('bulk')}
                  className={['backend-tab-link', mode === 'bulk' ? 'backend-tab-link-active' : ''].join(' ')}
                >
                  Bulk paste
                </button>
              </div>
              <p className="text-xs text-[var(--admin-text-muted)]">
                {mode === 'single'
                  ? 'Use single invite for one person with richer details.'
                  : 'Paste one person per line: email,firstName,lastName,organisation,role'}
              </p>

              {mode === 'single' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className="foundation-field" />
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className="foundation-field" />
                  </div>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email*" className="foundation-field" />
                  <div className="grid grid-cols-2 gap-3">
                    <input value={organisation} onChange={(e) => setOrganisation(e.target.value)} placeholder="Organisation" className="foundation-field" />
                    <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" className="foundation-field" />
                  </div>
                </>
              ) : (
                <>
                  <textarea
                    value={bulkRows}
                    onChange={(e) => setBulkRows(e.target.value)}
                    className="foundation-field min-h-36"
                    placeholder="email,firstName,lastName,organisation,role"
                  />
                  <p className="text-xs text-[var(--admin-text-muted)]">
                    Parsed rows: {parsedBulk.length}
                    {bulkIgnored > 0 ? ` · Ignored lines: ${bulkIgnored}` : ''}
                  </p>
                </>
              )}

              <label className="inline-flex items-center gap-2 rounded-lg bg-[var(--admin-surface-alt)] px-3 py-2 text-sm text-[var(--admin-text-primary)]">
                <input type="checkbox" checked={sendNow} onChange={(e) => setSendNow(e.target.checked)} className="h-4 w-4" />
                Send invitation email now
              </label>

              {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
              {success ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Invitations created.</p> : null}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={handleClose} className="foundation-btn foundation-btn-secondary px-3 py-2 text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="foundation-btn foundation-btn-primary px-3 py-2 text-sm">
                  {submitting
                    ? 'Saving...'
                    : mode === 'single'
                      ? sendNow
                        ? 'Create and send'
                        : 'Create invite'
                      : sendNow
                        ? `Create and send ${bulkCountLabel}`
                        : `Create ${bulkCountLabel}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
