import type { CampaignStatus } from '@/utils/assessments/campaign-types'
import { InviteDialog } from '@/components/dashboard/invite-dialog'
import { statusColors } from '../_lib/campaign-overview'

type AssessmentOption = {
  id: string
  name: string
}

function getStatusActionLabel(status: CampaignStatus) {
  if (status === 'active') return 'Activate'
  if (status === 'closed') return 'Close'
  if (status === 'archived') return 'Archive'
  return status
}

export function CampaignStatusBar({
  status,
  transitions,
  saving,
  assessments,
  onSetStatus,
  onInvited,
}: {
  status: CampaignStatus
  transitions: CampaignStatus[]
  saving: boolean
  assessments: AssessmentOption[]
  onSetStatus: (status: CampaignStatus) => Promise<void>
  onInvited: () => Promise<void>
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${statusColors[status] ?? statusColors.draft}`}>
        {status}
      </span>
      {transitions.map((nextStatus) => (
        <button
          key={nextStatus}
          onClick={() => {
            void onSetStatus(nextStatus)
          }}
          disabled={saving}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {getStatusActionLabel(nextStatus)}
        </button>
      ))}
      {assessments.length > 0 ? <InviteDialog assessments={assessments} onInvited={onInvited} /> : null}
    </div>
  )
}
