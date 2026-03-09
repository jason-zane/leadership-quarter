import { RelativeTime } from '@/components/ui/relative-time'
import type { Contact } from '../_lib/contact-detail'

export function ContactProfileCard({ contact }: { contact: Contact }) {
  const profileFields: Array<[string, string | null]> = [
    ['Age range', contact.age_range],
    ['Gender', contact.gender],
    ['Gender details', contact.gender_self_describe],
    ['Runner type', contact.runner_type],
    ['Location', contact.location_label],
    ['Budget range', contact.budget_range],
    ['Retreat style', contact.retreat_style_preference],
    ['Duration preference', contact.duration_preference],
    ['Travel radius', contact.travel_radius],
    ['Accommodation', contact.accommodation_preference],
    ['Community vs performance', contact.community_vs_performance],
    ['Preferred season', contact.preferred_season],
    ['Optional gender', contact.gender_optional],
    ['Life stage', contact.life_stage_optional]
  ]

  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-solid)] p-4 shadow-sm lg:col-span-2">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--admin-text-soft)]">
        Profile snapshot
      </h2>
      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        {profileFields.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-[var(--admin-surface-alt)] px-3 py-2">
            <dt className="text-xs uppercase tracking-wide text-[var(--admin-text-soft)]">{label}</dt>
            <dd className="mt-1 text-[var(--admin-text-primary)]">{value || '-'}</dd>
          </div>
        ))}
      </dl>
      {contact.what_would_make_it_great ? (
        <div className="mt-3 rounded-lg bg-[var(--admin-surface-alt)] p-3 text-sm text-[var(--admin-text-primary)]">
          <p className="mb-1 text-xs uppercase tracking-wide text-[var(--admin-text-soft)]">What would make it great</p>
          <p>{contact.what_would_make_it_great}</p>
        </div>
      ) : null}
      {contact.profile_v2_updated_at ? (
        <p className="mt-3 text-xs text-[var(--admin-text-muted)]">
          Profile updated <RelativeTime date={contact.profile_v2_updated_at} />
        </p>
      ) : null}
    </div>
  )
}
