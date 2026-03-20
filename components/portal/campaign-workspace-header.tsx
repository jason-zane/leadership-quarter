'use client'

import Link from 'next/link'
import { ActionMenu, type ActionItem } from '@/components/ui/action-menu'
import { PortalHeader } from '@/components/portal/ui/portal-header'

type CampaignStatus = 'draft' | 'active' | 'closed' | 'archived'
type CampaignWorkspaceTab = 'summary' | 'invitations' | 'responses' | 'analytics'

type CampaignSummary = {
  id: string
  name: string
  slug: string
  status: CampaignStatus
}

const allowedStatusTransitions: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ['active', 'archived'],
  active: ['closed', 'archived'],
  closed: ['archived'],
  archived: [],
}

function statusClasses(status: CampaignStatus) {
  if (status === 'active') return 'bg-emerald-100 text-emerald-800'
  if (status === 'closed') return 'bg-blue-100 text-blue-800'
  if (status === 'archived') return 'bg-zinc-200 text-zinc-700'
  return 'bg-amber-100 text-amber-800'
}

function tabHref(campaignId: string, tab: CampaignWorkspaceTab) {
  if (tab === 'summary') return `/portal/campaigns/${campaignId}`
  return `/portal/campaigns/${campaignId}/${tab}`
}

export function PortalCampaignWorkspaceHeader({
  campaign,
  activeTab,
  description,
  updatingStatus = false,
  onStatusChange,
}: {
  campaign: CampaignSummary
  activeTab: CampaignWorkspaceTab
  description?: string
  updatingStatus?: boolean
  onStatusChange?: (status: CampaignStatus) => void
}) {
  const allowedTransitions = allowedStatusTransitions[campaign.status] ?? []
  const actionItems: ActionItem[] = [
    ...(allowedTransitions.includes('active')
      ? [{
          type: 'item',
          label: updatingStatus ? 'Updating...' : 'Turn on (Active)',
          onSelect: () => onStatusChange?.('active'),
          disabled: updatingStatus || !onStatusChange,
        } as ActionItem]
      : []),
    ...(allowedTransitions.includes('closed')
      ? [{
          type: 'item',
          label: updatingStatus ? 'Updating...' : 'Turn off (Close)',
          onSelect: () => onStatusChange?.('closed'),
          disabled: updatingStatus || !onStatusChange,
        } as ActionItem]
      : []),
    ...(allowedTransitions.includes('archived')
      ? [{
          type: 'item',
          label: updatingStatus ? 'Updating...' : 'Archive campaign',
          onSelect: () => onStatusChange?.('archived'),
          disabled: updatingStatus || !onStatusChange,
          destructive: true,
        } as ActionItem]
      : []),
  ]

  return (
    <>
      <PortalHeader
        eyebrow="Campaign workspace"
        title={campaign.name}
        description={description ?? `Campaign workspace • ${campaign.slug}`}
        actions={(
          <div className="flex items-center gap-2">
            <span className={`portal-status-pill ${statusClasses(campaign.status)}`}>
              {campaign.status}
            </span>
            <a
              href={`/api/portal/campaigns/${campaign.id}/exports`}
              className="foundation-btn foundation-btn-secondary foundation-btn-sm portal-btn-secondary inline-flex items-center"
            >
              Export CSV
            </a>
            {actionItems.length > 0 ? <ActionMenu items={actionItems} /> : null}
          </div>
        )}
      />

      <nav className="backend-tab-bar" aria-label="Campaign workspace sections">
        {([
          ['summary', 'Summary'],
          ['invitations', 'Invitations'],
          ['responses', 'Responses'],
          ['analytics', 'Analytics'],
        ] as const).map(([tab, label]) => (
          <Link
            key={tab}
            href={tabHref(campaign.id, tab)}
            className={['backend-tab-link', activeTab === tab ? 'backend-tab-link-active' : ''].join(' ')}
          >
            {label}
          </Link>
        ))}
      </nav>
    </>
  )
}
