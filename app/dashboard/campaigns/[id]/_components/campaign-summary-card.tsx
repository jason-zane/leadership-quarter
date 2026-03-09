function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3 dark:border-zinc-800">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium capitalize text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  )
}

export function CampaignSummaryCard({
  reportAccess,
  demographicsEnabled,
  createdAt,
}: {
  reportAccess: string
  demographicsEnabled: boolean
  createdAt: string
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">Configuration</p>
      <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        <ConfigRow label="Report access" value={reportAccess} />
        <ConfigRow label="Demographics" value={demographicsEnabled ? 'Enabled' : 'Disabled'} />
        <ConfigRow label="Created" value={createdAt} />
      </dl>
    </div>
  )
}
