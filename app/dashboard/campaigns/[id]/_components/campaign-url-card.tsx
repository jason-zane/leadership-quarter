import { CopyButton } from './copy-button'

export function CampaignUrlCard({ campaignUrl }: { campaignUrl: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">Campaign URL</p>
      <div className="flex items-center gap-3">
        <code className="flex-1 rounded-lg bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {campaignUrl}
        </code>
        <CopyButton text={campaignUrl} />
      </div>
    </div>
  )
}
