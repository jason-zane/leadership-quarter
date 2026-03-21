import { CopyButton } from './copy-button'

export function CampaignUrlCard({ campaignUrl, status }: { campaignUrl: string; status: string }) {
  const isDraft = status !== 'active'

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">Public campaign URL</p>
      <div className="flex items-center gap-3">
        <code className={`flex-1 rounded-lg px-3 py-2 font-mono text-sm ${isDraft ? 'bg-zinc-50 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500' : 'bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}`}>
          {campaignUrl}
        </code>
        <CopyButton text={campaignUrl} disabled={isDraft} />
      </div>
      {isDraft ? (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
          This link won&apos;t work until the campaign is activated.
        </p>
      ) : null}
    </div>
  )
}
