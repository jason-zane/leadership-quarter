import { CopyButton } from './copy-button'

export function CampaignUrlCard({ campaignUrl, status }: { campaignUrl: string; status: string }) {
  const isDraft = status !== 'active'

  return (
    <div className="rounded-[1.8rem] border border-[rgba(103,127,159,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,251,255,0.9))] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">Launch URL</p>
          <h3 className="mt-2 font-serif text-[1.35rem] leading-[1.05] text-[var(--admin-text-primary)]">
            Public campaign address
          </h3>
          <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
            {isDraft
              ? 'Activate the campaign before sharing this link externally.'
              : 'This is the live URL candidates can open directly.'}
          </p>
        </div>
        <span
          className={[
            'inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]',
            isDraft
              ? 'bg-amber-100 text-amber-700'
              : 'bg-emerald-100 text-emerald-700',
          ].join(' ')}
        >
          {isDraft ? 'Inactive' : 'Live'}
        </span>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <code className={`flex-1 rounded-[1.15rem] border border-[rgba(103,127,159,0.14)] px-3 py-3 font-mono text-sm ${isDraft ? 'bg-[rgba(246,248,251,0.84)] text-[var(--admin-text-soft)]' : 'bg-[rgba(246,248,251,0.84)] text-[var(--admin-text-primary)]'}`}>
          {campaignUrl}
        </code>
        <CopyButton text={campaignUrl} disabled={isDraft} />
      </div>
      {isDraft ? (
        <p className="mt-3 text-xs font-medium text-amber-700">
          This link will stay inactive until the campaign status moves to active.
        </p>
      ) : null}
    </div>
  )
}
