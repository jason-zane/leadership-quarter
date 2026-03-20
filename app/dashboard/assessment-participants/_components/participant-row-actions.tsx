'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ActionMenu, type ActionItem } from '@/components/ui/action-menu'

type Props = {
  participantName: string
  detailHref: string
  contactHref: string | null
  email: string | null
  participantRecordId: string | null
  participantStatus: 'active' | 'archived'
  latestSubmission:
    | {
        submissionId: string
        assessmentId: string
        detailHref: string
      }
    | null
}

export function ParticipantRowActions({
  participantName,
  detailHref,
  contactHref,
  email,
  participantRecordId,
  participantStatus,
  latestSubmission,
}: Props) {
  const router = useRouter()

  async function copyEmail() {
    if (!email) return
    try {
      await navigator.clipboard.writeText(email)
      toast.success('Email copied.')
    } catch {
      toast.error('Could not copy the email address.')
    }
  }

  async function deleteLatestResponse() {
    if (!latestSubmission) return
    if (!window.confirm(`Delete the latest response for ${participantName}? This cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(
        `/api/admin/assessments/${latestSubmission.assessmentId}/responses/${latestSubmission.submissionId}`,
        { method: 'DELETE' }
      )
      const body = (await response.json()) as { ok?: boolean; error?: string }
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? 'response_delete_failed')
      }

      toast.success('Latest response deleted.')
      router.refresh()
    } catch {
      toast.error('Could not delete the latest response.')
    }
  }

  async function updateParticipantLifecycle(action: 'archive' | 'restore') {
    if (!participantRecordId) return
    try {
      const response = await fetch(`/api/admin/assessment-participants/${participantRecordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const body = (await response.json()) as { ok?: boolean; error?: string }
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? 'participant_update_failed')
      }

      toast.success(action === 'archive' ? 'Participant archived.' : 'Participant restored.')
      router.refresh()
    } catch {
      toast.error(action === 'archive' ? 'Could not archive the participant.' : 'Could not restore the participant.')
    }
  }

  const items: ActionItem[] = [
    {
      type: 'item',
      label: 'Open profile',
      onSelect: () => router.push(detailHref),
    },
  ]

  if (contactHref) {
    items.push({
      type: 'item',
      label: 'Open linked contact',
      onSelect: () => router.push(contactHref),
    })
  }

  if (latestSubmission) {
    items.push({
      type: 'item',
      label: 'Open latest response',
      onSelect: () => router.push(latestSubmission.detailHref),
    })
  }

  if (email) {
    items.push({
      type: 'item',
      label: 'Copy email',
      onSelect: () => {
        void copyEmail()
      },
    })
  }

  if (latestSubmission) {
    items.push({ type: 'separator' })
    items.push({
      type: 'item',
      label: 'Delete latest response',
      onSelect: () => {
        void deleteLatestResponse()
      },
      destructive: true,
    })
  }

  if (participantRecordId) {
    items.push({ type: 'separator' })
    items.push({
      type: 'item',
      label: participantStatus === 'archived' ? 'Restore participant' : 'Archive participant',
      onSelect: () => {
        void updateParticipantLifecycle(participantStatus === 'archived' ? 'restore' : 'archive')
      },
      destructive: participantStatus !== 'archived',
    })
  }

  return <ActionMenu items={items} />
}
