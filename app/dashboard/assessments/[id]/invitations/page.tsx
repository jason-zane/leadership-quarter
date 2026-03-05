'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { InviteDialog } from '@/components/dashboard/invite-dialog'

type Invitation = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  status: string
  sent_at: string | null
  completed_at: string | null
  token: string
}

type Cohort = {
  id: string
  name: string
  status: string
  created_at: string
}

const statusColors: Record<string, string> = {
  pending: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  opened: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  started: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

function getSiteUrl() {
  return typeof window !== 'undefined' ? window.location.origin : ''
}

function CopyTokenButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(`${getSiteUrl()}/assess/i/${token}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
      {copied ? 'Copied' : 'Copy personal link'}
    </button>
  )
}

function ResendButton({ invitationId, onSent }: { invitationId: string; onSent: () => void }) {
  const [sending, setSending] = useState(false)
  async function resend() {
    setSending(true)
    await fetch(`/api/admin/invitations/${invitationId}/send`, { method: 'POST' })
    setSending(false)
    onSent()
  }
  return (
    <button onClick={resend} disabled={sending} className="text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-50 dark:hover:text-zinc-200">
      {sending ? '…' : 'Resend'}
    </button>
  )
}

function CopyPublicLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={copy}
      className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      {copied ? 'Copied' : 'Copy public link'}
    </button>
  )
}

export default function SurveyInvitationsPage() {
  const params = useParams<{ id: string }>()
  const assessmentId = params.id
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [publicUrl, setPublicUrl] = useState<string | null>(null)

  async function reloadData() {
    const [iRes, cRes, sRes] = await Promise.all([
      fetch(`/api/admin/assessments/${assessmentId}/invitations`, { cache: 'no-store' }),
      fetch(`/api/admin/assessments/${assessmentId}/cohorts`, { cache: 'no-store' }),
      fetch(`/api/admin/assessments/${assessmentId}`, { cache: 'no-store' }),
    ])
    const iBody = (await iRes.json()) as { invitations?: Invitation[] }
    const cBody = (await cRes.json()) as { cohorts?: Cohort[] }
    const sBody = (await sRes.json()) as {
      assessment?: { public_url?: string | null }
      survey?: { public_url?: string | null }
    }
    setInvitations(iBody.invitations ?? [])
    setCohorts(cBody.cohorts ?? [])
    const rawPublicUrl = (sBody.assessment ?? sBody.survey)?.public_url
    setPublicUrl(rawPublicUrl ? `${getSiteUrl()}${rawPublicUrl}` : null)
  }

  useEffect(() => {
    let active = true
    ;(async () => {
      const [iRes, cRes, sRes] = await Promise.all([
        fetch(`/api/admin/assessments/${assessmentId}/invitations`, { cache: 'no-store' }),
        fetch(`/api/admin/assessments/${assessmentId}/cohorts`, { cache: 'no-store' }),
        fetch(`/api/admin/assessments/${assessmentId}`, { cache: 'no-store' }),
      ])
      const iBody = (await iRes.json()) as { invitations?: Invitation[] }
      const cBody = (await cRes.json()) as { cohorts?: Cohort[] }
      const sBody = (await sRes.json()) as {
        assessment?: { public_url?: string | null }
        survey?: { public_url?: string | null }
      }
      if (!active) return
      setInvitations(iBody.invitations ?? [])
      setCohorts(cBody.cohorts ?? [])
      const rawPublicUrl = (sBody.assessment ?? sBody.survey)?.public_url
      setPublicUrl(rawPublicUrl ? `${getSiteUrl()}${rawPublicUrl}` : null)
    })()
    return () => {
      active = false
    }
  }, [assessmentId])

  const counts = {
    sent: invitations.filter((i) => i.status === 'sent').length,
    opened: invitations.filter((i) => i.status === 'opened').length,
    completed: invitations.filter((i) => i.status === 'completed').length,
    pending: invitations.filter((i) => i.status === 'pending').length,
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
          <span><span className="font-semibold text-blue-600">{counts.sent}</span> sent</span>
          <span><span className="font-semibold text-yellow-600">{counts.opened}</span> opened</span>
          <span><span className="font-semibold text-green-600">{counts.completed}</span> completed</span>
          <span><span className="font-semibold text-zinc-700 dark:text-zinc-300">{counts.pending}</span> pending</span>
        </div>
        <div className="flex gap-2">
          {publicUrl
            ? <CopyPublicLinkButton url={publicUrl} />
            : <span className="text-sm text-zinc-400">No public URL configured</span>
          }
          <InviteDialog assessmentId={assessmentId} onInvited={() => void reloadData()} />
          <Link
            href={`/dashboard/assessments/${assessmentId}/cohorts/new`}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            + Create cohort
          </Link>
        </div>
      </div>

      {/* Invitations table */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">All invitations</h2>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Sent</th>
                <th className="px-4 py-3 font-medium">Completed</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-400">No invitations yet. Invite someone to get started.</td>
                </tr>
              ) : (
                invitations.map((inv) => (
                  <tr key={inv.id} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="px-4 py-3 font-medium">
                      {[inv.first_name, inv.last_name].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{inv.email}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[inv.status] ?? statusColors.pending}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {inv.sent_at ? new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' }).format(new Date(inv.sent_at)) : '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {inv.completed_at ? new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' }).format(new Date(inv.completed_at)) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ResendButton invitationId={inv.id} onSent={() => void reloadData()} />
                        <CopyTokenButton token={inv.token} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Cohorts */}
      {cohorts.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Cohorts</h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map((cohort) => (
                  <tr key={cohort.id} className="border-t border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/assessments/${assessmentId}/cohorts/${cohort.id}`} className="font-medium hover:underline">
                        {cohort.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize text-zinc-500">{cohort.status}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(cohort.created_at))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
