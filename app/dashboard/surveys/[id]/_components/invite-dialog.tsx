'use client'

import { useState } from 'react'

type Props = {
  surveyId: string
  onInvited?: () => void
}

export function InviteDialog({ surveyId, onInvited }: Props) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [role, setRole] = useState('')
  const [sendNow, setSendNow] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function reset() {
    setEmail('')
    setFirstName('')
    setLastName('')
    setOrganisation('')
    setRole('')
    setSendNow(true)
    setError(null)
    setSuccess(false)
  }

  function handleClose() {
    setOpen(false)
    reset()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !firstName.trim()) {
      setError('Email and first name are required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/surveys/${surveyId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim() || undefined, organisation: organisation.trim() || undefined, role: role.trim() || undefined, sendNow }),
      })
      const body = (await res.json()) as { ok: boolean; error?: string }
      if (!res.ok || !body.ok) {
        setError(body.error ?? 'Failed to create invitation.')
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Invite someone
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Invite someone</h2>
              <button onClick={handleClose} className="rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {success ? (
              <p className="text-sm text-green-600 dark:text-green-400">Invitation created successfully.</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">First name *</label>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Last name</label>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Organisation</label>
                    <input
                      value={organisation}
                      onChange={(e) => setOrganisation(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Role</label>
                    <input
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={sendNow}
                    onChange={(e) => setSendNow(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">Send invitation email now</span>
                </label>

                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" onClick={handleClose} className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    {submitting ? 'Sending…' : 'Send invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
