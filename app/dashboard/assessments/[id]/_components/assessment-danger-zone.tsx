'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  assessmentId: string
  assessmentName: string
  assessmentStatus: string
  responseCount: number
}

export function AssessmentDangerZone({ assessmentId, assessmentName, assessmentStatus, responseCount }: Props) {
  const router = useRouter()
  const [archiving, setArchiving] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isArchived = assessmentStatus === 'archived'
  const canDelete = responseCount === 0

  async function archive() {
    setArchiving(true)
    setError(null)
    const res = await fetch(`/api/admin/assessments/${assessmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })
    setArchiving(false)
    if (!res.ok) {
      setError('Failed to archive assessment.')
      return
    }
    router.push('/dashboard/assessments')
  }

  async function restore() {
    setRestoring(true)
    setError(null)
    const res = await fetch(`/api/admin/assessments/${assessmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'draft' }),
    })
    setRestoring(false)
    if (!res.ok) {
      setError('Failed to restore assessment.')
      return
    }
    router.refresh()
  }

  async function deleteAssessment() {
    if (deleteConfirmName !== assessmentName) return
    setDeleting(true)
    setError(null)
    const res = await fetch(`/api/admin/assessments/${assessmentId}`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) {
      setError('Failed to delete assessment.')
      return
    }
    router.push('/dashboard/assessments')
  }

  return (
    <div className="rounded-xl border border-red-200 bg-white dark:border-red-900/40 dark:bg-zinc-900">
      <div className="px-5 py-4">
        <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Danger zone</h2>
      </div>

      <div className="divide-y divide-red-100 border-t border-red-100 dark:divide-red-900/30 dark:border-red-900/30">
        {!isArchived ? (
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Archive assessment</p>
              <p className="text-xs text-zinc-500">Hides this assessment from the default list. Can be restored later.</p>
            </div>
            <button
              onClick={() => void archive()}
              disabled={archiving}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              {archiving ? 'Archiving...' : 'Archive'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Restore assessment</p>
              <p className="text-xs text-zinc-500">Moves this assessment back to draft status.</p>
            </div>
            <button
              onClick={() => void restore()}
              disabled={restoring}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {restoring ? 'Restoring...' : 'Restore to draft'}
            </button>
          </div>
        )}

        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Delete assessment</p>
              {canDelete ? (
                <p className="text-xs text-zinc-500">Permanently delete this assessment and all its data. This cannot be undone.</p>
              ) : (
                <p className="text-xs text-zinc-500">Cannot delete — this assessment has {responseCount} response{responseCount !== 1 ? 's' : ''}. Archive it instead.</p>
              )}
            </div>
            {canDelete && !showDeleteConfirm && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Delete
              </button>
            )}
          </div>

          {canDelete && showDeleteConfirm && (
            <div className="mt-3 space-y-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/10">
              <p className="text-xs font-medium text-red-700 dark:text-red-400">
                Type <span className="font-mono">{assessmentName}</span> to confirm deletion
              </p>
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={assessmentName}
                className="w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm dark:border-red-800 dark:bg-zinc-900"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void deleteAssessment()}
                  disabled={deleting || deleteConfirmName !== assessmentName}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Permanently delete'}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmName('') }}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {error ? <p className="px-5 pb-4 text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
