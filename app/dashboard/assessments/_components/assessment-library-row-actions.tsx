'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ActionMenu } from '@/components/ui/action-menu'

type Props = {
  assessmentId: string
  assessmentName: string
  assessmentStatus: string
}

export function AssessmentLibraryRowActions({ assessmentId, assessmentName, assessmentStatus }: Props) {
  const router = useRouter()
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const isArchived = assessmentStatus === 'archived'
  const isBusy = pendingAction !== null

  async function readJson(response: Response) {
    return (await response.json().catch(() => null)) as { ok?: boolean; error?: string; assessment?: { id?: string } } | null
  }

  async function archiveAssessment(nextStatus: 'archived' | 'draft') {
    const verb = nextStatus === 'archived' ? 'archive' : 'restore'
    const confirmed = window.confirm(
      nextStatus === 'archived'
        ? `Archive "${assessmentName}"? You can restore it later.`
        : `Restore "${assessmentName}" to draft?`
    )

    if (!confirmed) {
      return
    }

    setPendingAction(verb)

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })

      if (!response.ok) {
        window.alert(nextStatus === 'archived' ? 'Could not archive assessment.' : 'Could not restore assessment.')
        return
      }

      router.refresh()
    } finally {
      setPendingAction(null)
    }
  }

  async function duplicateAssessment() {
    setPendingAction('duplicate')

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/duplicate`, { method: 'POST' })
      const body = await readJson(response)
      const duplicatedId = body?.assessment?.id

      if (!response.ok || !body?.ok || !duplicatedId) {
        window.alert('Could not duplicate assessment.')
        return
      }

      router.push(`/dashboard/assessments/${duplicatedId}`)
      router.refresh()
    } finally {
      setPendingAction(null)
    }
  }

  async function deleteAssessment() {
    const confirmed = window.confirm(
      `Delete "${assessmentName}"? This permanently removes the assessment if it has no submissions.`
    )

    if (!confirmed) {
      return
    }

    setPendingAction('delete')

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}`, { method: 'DELETE' })
      const body = await readJson(response)

      if (!response.ok || !body?.ok) {
        if (body?.error === 'survey_has_submissions') {
          window.alert('This assessment already has submissions. Archive it instead.')
          return
        }

        window.alert('Could not delete assessment.')
        return
      }

      router.refresh()
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <ActionMenu
      items={[
        {
          type: 'item',
          label: 'Open workspace',
          onSelect: () => router.push(`/dashboard/assessments/${assessmentId}`),
          disabled: isBusy,
        },
        {
          type: 'item',
          label: pendingAction === 'duplicate' ? 'Duplicating...' : 'Duplicate',
          onSelect: () => void duplicateAssessment(),
          disabled: isBusy,
        },
        {
          type: 'item',
          label: isArchived
            ? pendingAction === 'restore'
              ? 'Restoring...'
              : 'Restore to draft'
            : pendingAction === 'archive'
              ? 'Archiving...'
              : 'Archive',
          onSelect: () => void archiveAssessment(isArchived ? 'draft' : 'archived'),
          disabled: isBusy,
        },
        { type: 'separator' },
        {
          type: 'item',
          label: pendingAction === 'delete' ? 'Deleting...' : 'Delete',
          onSelect: () => void deleteAssessment(),
          destructive: true,
          disabled: isBusy,
        },
      ]}
    />
  )
}
