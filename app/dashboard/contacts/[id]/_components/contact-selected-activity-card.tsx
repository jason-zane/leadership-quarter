import Link from 'next/link'
import type { ActivityItem } from '../_lib/contact-detail'

export function ContactSelectedActivityCard({
  contactId,
  validFilter,
  item,
}: {
  contactId: string
  validFilter: string
  item: ActivityItem
}) {
  return (
    <div className="mb-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-solid)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{item.title}</p>
          <p className="mt-1 text-xs text-[var(--admin-text-muted)]">{item.subtitle}</p>
          {item.detail ? <p className="mt-2 text-sm text-[var(--admin-text-primary)]">{item.detail}</p> : null}
        </div>
        <Link
          href={`/dashboard/contacts/${contactId}?feed=${validFilter}`}
          className="text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-accent-strong)]"
        >
          Clear selection
        </Link>
      </div>
    </div>
  )
}
