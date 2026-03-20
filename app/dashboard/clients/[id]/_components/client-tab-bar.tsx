'use client'

export type ClientTab = 'members' | 'assessments' | 'branding' | 'campaigns' | 'audit'

const tabs: { label: string; value: ClientTab }[] = [
  { label: 'Members', value: 'members' },
  { label: 'Assessments', value: 'assessments' },
  { label: 'Branding', value: 'branding' },
  { label: 'Campaigns', value: 'campaigns' },
  { label: 'Audit', value: 'audit' },
]

export function ClientTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: ClientTab
  onTabChange: (tab: ClientTab) => void
}) {
  return (
    <div className="admin-toggle-group overflow-x-auto" role="tablist" aria-label="Client workspace sections">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.value}
          onClick={() => onTabChange(tab.value)}
          className={activeTab === tab.value ? 'admin-toggle-pill admin-toggle-pill-active' : 'admin-toggle-pill'}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
