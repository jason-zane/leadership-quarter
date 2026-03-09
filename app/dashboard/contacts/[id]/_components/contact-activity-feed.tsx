import Link from 'next/link'
import { RelativeTime } from '@/components/ui/relative-time'
import {
  ACTIVITY_FILTER_OPTIONS,
  type ActivityFeedFilter,
  type ActivityItem,
} from '../_lib/contact-detail'

function itemTypeClass(type: ActivityItem['type']) {
  if (type === 'email') return 'bg-blue-100 text-blue-700'
  if (type === 'submission') return 'bg-emerald-100 text-emerald-700'
  if (type === 'note') return 'bg-amber-100 text-amber-700'
  if (type === 'status') return 'bg-violet-100 text-violet-700'
  if (type === 'profile') return 'bg-cyan-100 text-cyan-700'
  return 'bg-zinc-200 text-zinc-700'
}

export function ContactActivityFeed({
  contactId,
  validFilter,
  selectedItemId,
  items,
}: {
  contactId: string
  validFilter: ActivityFeedFilter
  selectedItemId: string
  items: ActivityItem[]
}) {
  function feedLink(feed: ActivityFeedFilter) {
    return `/dashboard/contacts/${contactId}?feed=${feed}${selectedItemId ? `&activity=${selectedItemId}` : ''}`
  }

  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-solid)] p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {ACTIVITY_FILTER_OPTIONS.map((option) => {
          const active = validFilter === option.value
          return (
            <Link
              key={option.value}
              href={feedLink(option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-[var(--admin-accent)] text-white'
                  : 'bg-[var(--admin-surface-alt)] text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-strong)]'
              }`}
            >
              {option.label}
            </Link>
          )
        })}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--admin-text-muted)]">No activity for this filter.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="block rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-3 py-3 transition-colors hover:bg-[var(--admin-surface-strong)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${itemTypeClass(item.type)}`}
                    >
                      {item.type}
                    </span>
                    <p className="truncate text-sm font-medium text-[var(--admin-text-primary)]">{item.title}</p>
                  </div>
                  <p className="mt-1 truncate text-xs text-[var(--admin-text-muted)]">{item.subtitle}</p>
                  {item.detail ? (
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--admin-text-primary)]">{item.detail}</p>
                  ) : null}
                </div>
                <p className="shrink-0 text-xs text-[var(--admin-text-muted)]">
                  <RelativeTime date={item.createdAt} />
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
