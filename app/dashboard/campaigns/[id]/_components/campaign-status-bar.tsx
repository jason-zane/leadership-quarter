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
    <div className="flex flex-wrap items-center gap-3 rounded-[1.5rem] border border-[rgba(103,127,159,0.14)] bg-white/72 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
      <span className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize ${statusColors[status] ?? statusColors.draft}`}>
        {status}
      </span>
      {transitions.map((nextStatus) => (
        <button
          key={nextStatus}
          onClick={() => {
            void onSetStatus(nextStatus)
          }}
          disabled={saving}
          className="rounded-full border border-[rgba(103,127,159,0.2)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--admin-text-primary)] hover:bg-[rgba(103,127,159,0.08)] disabled:opacity-50"
        >
          {getStatusActionLabel(nextStatus)}
        </button>
      ))}
      {assessments.length > 0 ? <InviteDialog assessments={assessments} onInvited={onInvited} /> : null}
    </div>
  )
}
