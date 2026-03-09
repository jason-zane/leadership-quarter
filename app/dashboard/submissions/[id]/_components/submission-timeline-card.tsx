import { RelativeTime } from '@/components/ui/relative-time'
import type { SubmissionEvent } from '../_lib/submission-detail'

export function SubmissionTimelineCard({ events }: { events: SubmissionEvent[] }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Timeline
      </h2>
      {events.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No events yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/40"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-zinc-800 dark:text-zinc-100">
                  {event.event_type.replaceAll('_', ' ')}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  <RelativeTime date={event.created_at} />
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
