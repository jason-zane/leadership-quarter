create table if not exists public.submission_forms (
  key text primary key,
  name text not null,
  status text not null default 'active',
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submission_forms_status_check check (status in ('active', 'inactive'))
);

alter table public.submission_forms enable row level security;

drop policy if exists "No anonymous access" on public.submission_forms;
create policy "No anonymous access"
  on public.submission_forms
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.submission_forms;
create policy "No authenticated direct access"
  on public.submission_forms
  for all
  to authenticated
  using (false)
  with check (false);

create table if not exists public.submission_field_definitions (
  id uuid primary key default gen_random_uuid(),
  form_key text not null references public.submission_forms (key) on delete cascade,
  field_key text not null,
  label text not null,
  field_type text not null,
  required boolean not null default false,
  sensitive boolean not null default false,
  options jsonb,
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submission_field_type_check check (
    field_type in ('text', 'number', 'select', 'multiselect', 'boolean', 'textarea')
  ),
  constraint submission_field_unique unique (form_key, field_key)
);

create index if not exists idx_submission_field_definitions_form_key
  on public.submission_field_definitions (form_key);

alter table public.submission_field_definitions enable row level security;

drop policy if exists "No anonymous access" on public.submission_field_definitions;
create policy "No anonymous access"
  on public.submission_field_definitions
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.submission_field_definitions;
create policy "No authenticated direct access"
  on public.submission_field_definitions
  for all
  to authenticated
  using (false)
  with check (false);

alter table public.interest_submissions
  add column if not exists form_key text references public.submission_forms (key),
  add column if not exists schema_version integer,
  add column if not exists answers jsonb,
  add column if not exists raw_payload jsonb,
  add column if not exists review_status text,
  add column if not exists assigned_user_id uuid references auth.users (id) on delete set null,
  add column if not exists owner_user_id uuid references auth.users (id) on delete set null,
  add column if not exists reviewed_by_user_id uuid references auth.users (id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists first_response_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists priority text,
  add column if not exists updated_at timestamptz;

insert into public.submission_forms (key, name, status, schema_version)
values ('register_interest', 'Register Interest', 'active', 1)
on conflict (key) do update
set
  name = excluded.name,
  status = excluded.status,
  schema_version = excluded.schema_version,
  updated_at = now();

update public.interest_submissions
set
  form_key = coalesce(form_key, 'register_interest'),
  schema_version = coalesce(schema_version, 1),
  answers = coalesce(
    answers,
    jsonb_strip_nulls(
      jsonb_build_object(
        'source', source
      )
    )
  ),
  raw_payload = coalesce(
    raw_payload,
    jsonb_strip_nulls(
      jsonb_build_object(
        'legacy', true,
        'firstName', first_name,
        'lastName', last_name,
        'email', email,
        'source', source
      )
    )
  ),
  review_status = coalesce(review_status, 'approved'),
  priority = coalesce(priority, 'normal'),
  updated_at = coalesce(updated_at, created_at)
where true;

alter table public.interest_submissions
  alter column form_key set default 'register_interest',
  alter column schema_version set default 1,
  alter column answers set default '{}'::jsonb,
  alter column raw_payload set default '{}'::jsonb,
  alter column review_status set default 'pending_review',
  alter column priority set default 'normal',
  alter column updated_at set default now();

update public.interest_submissions
set review_status = 'pending_review'
where review_status not in ('pending_review', 'approved', 'changes_requested');

update public.interest_submissions
set priority = 'normal'
where priority not in ('low', 'normal', 'high');

alter table public.interest_submissions
  alter column form_key set not null,
  alter column schema_version set not null,
  alter column answers set not null,
  alter column raw_payload set not null,
  alter column review_status set not null,
  alter column priority set not null,
  alter column updated_at set not null;

alter table public.interest_submissions
  drop constraint if exists interest_submissions_review_status_check;
alter table public.interest_submissions
  add constraint interest_submissions_review_status_check check (
    review_status in ('pending_review', 'approved', 'changes_requested')
  );

alter table public.interest_submissions
  drop constraint if exists interest_submissions_priority_check;
alter table public.interest_submissions
  add constraint interest_submissions_priority_check check (
    priority in ('low', 'normal', 'high')
  );

create index if not exists idx_interest_submissions_form_key
  on public.interest_submissions (form_key);
create index if not exists idx_interest_submissions_review_status
  on public.interest_submissions (review_status);
create index if not exists idx_interest_submissions_assigned_user_id
  on public.interest_submissions (assigned_user_id);
create index if not exists idx_interest_submissions_owner_user_id
  on public.interest_submissions (owner_user_id);
create index if not exists idx_interest_submissions_priority
  on public.interest_submissions (priority);

create table if not exists public.submission_field_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.interest_submissions (id) on delete cascade,
  field_key text not null,
  proposed_value jsonb,
  existing_value jsonb,
  decision text not null default 'pending',
  decided_by_user_id uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submission_field_reviews_decision_check check (decision in ('pending', 'approved', 'rejected')),
  constraint submission_field_reviews_unique unique (submission_id, field_key)
);

create index if not exists idx_submission_field_reviews_submission_id
  on public.submission_field_reviews (submission_id);
create index if not exists idx_submission_field_reviews_decision
  on public.submission_field_reviews (decision);

alter table public.submission_field_reviews enable row level security;

drop policy if exists "No anonymous access" on public.submission_field_reviews;
create policy "No anonymous access"
  on public.submission_field_reviews
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.submission_field_reviews;
create policy "No authenticated direct access"
  on public.submission_field_reviews
  for all
  to authenticated
  using (false)
  with check (false);

create table if not exists public.submission_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.interest_submissions (id) on delete cascade,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_submission_events_submission_id
  on public.submission_events (submission_id);
create index if not exists idx_submission_events_created_at
  on public.submission_events (created_at desc);
create index if not exists idx_submission_events_event_type
  on public.submission_events (event_type);

alter table public.submission_events enable row level security;

drop policy if exists "No anonymous access" on public.submission_events;
create policy "No anonymous access"
  on public.submission_events
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.submission_events;
create policy "No authenticated direct access"
  on public.submission_events
  for all
  to authenticated
  using (false)
  with check (false);

alter table public.contacts
  add column if not exists weekly_distance_km integer,
  add column if not exists long_run_km integer,
  add column if not exists pace_group text,
  add column if not exists dietary_requirements text,
  add column if not exists injury_notes text,
  add column if not exists retreat_goals text,
  add column if not exists preferred_retreat_timing text,
  add column if not exists location_city text,
  add column if not exists phone text,
  add column if not exists profile_schema_version integer not null default 1;

insert into public.submission_field_definitions (
  form_key,
  field_key,
  label,
  field_type,
  required,
  sensitive,
  options,
  sort_order,
  is_active
)
values
  ('register_interest', 'first_name', 'First Name', 'text', true, false, null, 10, true),
  ('register_interest', 'last_name', 'Last Name', 'text', true, false, null, 20, true),
  ('register_interest', 'email', 'Email', 'text', true, false, null, 30, true),
  ('register_interest', 'source', 'How did you hear about us?', 'select', false, false, '["instagram", "friend", "running-club", "google", "podcast", "other"]'::jsonb, 40, true),
  ('register_interest', 'weekly_distance_km', 'Weekly Distance (km)', 'number', false, false, null, 50, true),
  ('register_interest', 'long_run_km', 'Long Run Distance (km)', 'number', false, false, null, 60, true),
  ('register_interest', 'pace_group', 'Preferred Pace Group', 'select', false, false, '["easy", "steady", "mixed"]'::jsonb, 70, true),
  ('register_interest', 'dietary_requirements', 'Dietary Requirements', 'textarea', false, true, null, 80, true),
  ('register_interest', 'injury_notes', 'Injury or Medical Notes', 'textarea', false, true, null, 90, true),
  ('register_interest', 'retreat_goals', 'Retreat Goals', 'textarea', false, false, null, 100, true),
  ('register_interest', 'preferred_retreat_timing', 'Preferred Retreat Timing', 'select', false, false, '["next_3_months", "next_6_months", "later", "unsure"]'::jsonb, 110, true),
  ('register_interest', 'city', 'City', 'text', false, false, null, 120, true),
  ('register_interest', 'phone', 'Phone Number', 'text', false, false, null, 130, true)
on conflict (form_key, field_key) do update
set
  label = excluded.label,
  field_type = excluded.field_type,
  required = excluded.required,
  sensitive = excluded.sensitive,
  options = excluded.options,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.submission_events (submission_id, event_type, event_data, created_at)
select
  s.id,
  'backfilled_legacy_submission',
  jsonb_build_object('schema_version', s.schema_version, 'form_key', s.form_key),
  s.created_at
from public.interest_submissions s
where not exists (
  select 1
  from public.submission_events e
  where e.submission_id = s.id
    and e.event_type = 'backfilled_legacy_submission'
);
