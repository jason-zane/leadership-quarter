alter table public.contacts
  add column if not exists age_range text,
  add column if not exists gender text,
  add column if not exists gender_self_describe text,
  add column if not exists runner_type text,
  add column if not exists location_label text,
  add column if not exists retreat_slug text,
  add column if not exists retreat_name text,
  add column if not exists budget_range text,
  add column if not exists retreat_style_preference text,
  add column if not exists duration_preference text,
  add column if not exists travel_radius text,
  add column if not exists accommodation_preference text,
  add column if not exists community_vs_performance text,
  add column if not exists preferred_season text,
  add column if not exists gender_optional text,
  add column if not exists life_stage_optional text,
  add column if not exists what_would_make_it_great text,
  add column if not exists profile_v2_updated_at timestamptz;

create index if not exists idx_contacts_age_range on public.contacts (age_range);
create index if not exists idx_contacts_runner_type on public.contacts (runner_type);
create index if not exists idx_contacts_budget_range on public.contacts (budget_range);
create index if not exists idx_contacts_location_label on public.contacts (location_label);

with latest_registration as (
  select distinct on (s.contact_id)
    s.contact_id,
    s.answers,
    s.created_at
  from public.interest_submissions s
  where s.contact_id is not null
    and s.form_key in ('retreat_registration_v1', 'general_registration_v1', 'register_interest')
  order by s.contact_id, s.created_at desc
),
latest_optional as (
  select distinct on (s.contact_id)
    s.contact_id,
    s.answers,
    s.created_at
  from public.interest_submissions s
  where s.contact_id is not null
    and s.form_key = 'retreat_profile_optional_v1'
  order by s.contact_id, s.created_at desc
)
update public.contacts c
set
  age_range = coalesce(lr.answers ->> 'age_range', c.age_range),
  gender = coalesce(lr.answers ->> 'gender', c.gender),
  gender_self_describe = coalesce(lr.answers ->> 'gender_self_describe', c.gender_self_describe),
  runner_type = coalesce(lr.answers ->> 'runner_type', c.runner_type),
  location_label = coalesce(lr.answers ->> 'location_label', c.location_label),
  retreat_slug = coalesce(lo.answers ->> 'retreat_slug', lr.answers ->> 'retreat_slug', c.retreat_slug),
  retreat_name = coalesce(lo.answers ->> 'retreat_name', lr.answers ->> 'retreat_name', c.retreat_name),
  budget_range = coalesce(lo.answers ->> 'budget_range', c.budget_range),
  retreat_style_preference = coalesce(lo.answers ->> 'retreat_style_preference', c.retreat_style_preference),
  duration_preference = coalesce(lo.answers ->> 'duration_preference', c.duration_preference),
  travel_radius = coalesce(lo.answers ->> 'travel_radius', c.travel_radius),
  accommodation_preference = coalesce(lo.answers ->> 'accommodation_preference', c.accommodation_preference),
  community_vs_performance = coalesce(lo.answers ->> 'community_vs_performance', c.community_vs_performance),
  preferred_season = coalesce(lo.answers ->> 'preferred_season', c.preferred_season),
  gender_optional = coalesce(lo.answers ->> 'gender_optional', c.gender_optional),
  life_stage_optional = coalesce(lo.answers ->> 'life_stage_optional', c.life_stage_optional),
  what_would_make_it_great = coalesce(lo.answers ->> 'what_would_make_it_great', c.what_would_make_it_great),
  profile_v2_updated_at = coalesce(c.profile_v2_updated_at, now()),
  updated_at = now()
from latest_registration lr
left join latest_optional lo on lo.contact_id = lr.contact_id
where c.id = lr.contact_id;

insert into public.contact_events (contact_id, event_type, event_data)
select
  c.id,
  'profile_backfilled',
  jsonb_build_object('migration', '20260225213000_contact_profile_v2_sync')
from public.contacts c
where (
  c.age_range is not null
  or c.gender is not null
  or c.runner_type is not null
  or c.budget_range is not null
  or c.retreat_style_preference is not null
)
and not exists (
  select 1
  from public.contact_events e
  where e.contact_id = c.id
    and e.event_type = 'profile_backfilled'
);
