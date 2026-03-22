import type { CampaignStatus } from '@/utils/assessments/campaign-types'
import { InviteDialog } from '@/components/dashboard/invite-dialog'
import { FoundationButton } from '@/components/ui/foundation/button'
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
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.7rem] border border-[rgba(103,127,159,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,250,254,0.88))] p-4 shadow-[0_20px_48px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize ${statusColors[status] ?? statusColors.draft}`}>
          {status}
        </span>
        <p className="text-sm text-[var(--admin-text-muted)]">
          Control campaign availability, then invite participants once the journey is ready.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {transitions.map((nextStatus) => (
          <FoundationButton
            key={nextStatus}
            type="button"
            variant={nextStatus === 'active' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              void onSetStatus(nextStatus)
            }}
            disabled={saving}
          >
            {getStatusActionLabel(nextStatus)}
          </FoundationButton>
        ))}
        {assessments.length > 0 ? <InviteDialog assessments={assessments} onInvited={onInvited} /> : null}
      </div>
    </div>
  )
}
