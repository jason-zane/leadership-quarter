import type { CampaignStatus } from '@/utils/assessments/campaign-types'
import { InviteDialog } from '@/components/dashboard/invite-dialog'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import { CopyButton } from './copy-button'

function getStatusActionLabel(status: CampaignStatus) {
  if (status === 'active') return 'Activate'
  if (status === 'closed') return 'Close'
  if (status === 'archived') return 'Archive'
  return status
}

export function CampaignActionsCard({
  status,
  transitions,
  saving,
  campaignId,
  campaignUrl,
  onSetStatus,
  onInvited,
}: {
  status: CampaignStatus
  transitions: CampaignStatus[]
  saving: boolean
  campaignId: string
  campaignUrl: string
  onSetStatus: (status: CampaignStatus) => Promise<void>
  onInvited: () => Promise<void>
}) {
  const isDraft = status !== 'active'

  return (
    <FoundationSurface className="space-y-5 p-6 md:p-7">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">Campaign actions</p>
        <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
          Manage availability and share with participants.
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
        <InviteDialog campaignId={campaignId} onInvited={onInvited} />
      </div>

      <div className="flex items-center gap-3">
        <code className={`flex-1 rounded-[1.15rem] border border-[rgba(103,127,159,0.14)] px-3 py-3 font-mono text-sm ${isDraft ? 'bg-[rgba(246,248,251,0.84)] text-[var(--admin-text-soft)]' : 'bg-[rgba(246,248,251,0.84)] text-[var(--admin-text-primary)]'}`}>
          {campaignUrl}
        </code>
        <CopyButton text={campaignUrl} disabled={isDraft} />
      </div>

      {isDraft ? (
        <p className="text-xs font-medium text-amber-700">
          Activate the campaign before sharing this link.
        </p>
      ) : null}
    </FoundationSurface>
  )
}
