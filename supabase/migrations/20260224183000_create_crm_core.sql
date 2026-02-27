create table if not exists public.contact_statuses (
  key text primary key,
  label text not null,
  sort_order integer not null unique
);

insert into public.contact_statuses (key, label, sort_order)
values
  ('new', 'New', 10),
  ('qualified', 'Qualified', 20),
  ('contacted', 'Contacted', 30),
  ('nurture', 'Nurture', 40),
  ('closed_won', 'Closed Won', 50),
  ('closed_lost', 'Closed Lost', 60)
on conflict (key) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order;

alter table public.contact_statuses enable row level security;

drop policy if exists "No anonymous access" on public.contact_statuses;
create policy "No anonymous access"
  on public.contact_statuses
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.contact_statuses;
create policy "No authenticated direct access"
  on public.contact_statuses
  for all
  to authenticated
  using (false)
  with check (false);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'staff',
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('admin', 'staff'))
);

create index if not exists idx_profiles_role on public.profiles (role);

alter table public.profiles enable row level security;

drop policy if exists "No anonymous access" on public.profiles;
create policy "No anonymous access"
  on public.profiles
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.profiles;
create policy "No authenticated direct access"
  on public.profiles
  for all
  to authenticated
  using (false)
  with check (false);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  email_normalized text generated always as (lower(email)) stored,
  source text,
  status text not null default 'new',
  owner_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_status_check check (
    status in ('new', 'qualified', 'contacted', 'nurture', 'closed_won', 'closed_lost')
  )
);

create unique index if not exists idx_contacts_email_normalized_unique
  on public.contacts (email_normalized);
create index if not exists idx_contacts_status on public.contacts (status);
create index if not exists idx_contacts_created_at on public.contacts (created_at desc);
create index if not exists idx_contacts_owner_user_id on public.contacts (owner_user_id);

alter table public.contacts enable row level security;

drop policy if exists "No anonymous access" on public.contacts;
create policy "No anonymous access"
  on public.contacts
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.contacts;
create policy "No authenticated direct access"
  on public.contacts
  for all
  to authenticated
  using (false)
  with check (false);

create table if not exists public.contact_events (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  note text,
  actor_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_events_contact_id on public.contact_events (contact_id);
create index if not exists idx_contact_events_created_at on public.contact_events (created_at desc);
create index if not exists idx_contact_events_event_type on public.contact_events (event_type);

alter table public.contact_events enable row level security;

drop policy if exists "No anonymous access" on public.contact_events;
create policy "No anonymous access"
  on public.contact_events
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.contact_events;
create policy "No authenticated direct access"
  on public.contact_events
  for all
  to authenticated
  using (false)
  with check (false);

alter table public.interest_submissions
  add column if not exists contact_id uuid references public.contacts (id) on delete set null;

create index if not exists idx_interest_submissions_contact_id
  on public.interest_submissions (contact_id);

insert into public.contacts (first_name, last_name, email, source, status)
select distinct on (lower(s.email))
  s.first_name,
  s.last_name,
  s.email,
  s.source,
  'new'
from public.interest_submissions s
where trim(s.email) <> ''
order by lower(s.email), s.created_at desc
on conflict (email_normalized) do update
set
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  source = coalesce(excluded.source, public.contacts.source),
  updated_at = now();

update public.interest_submissions s
set contact_id = c.id
from public.contacts c
where s.contact_id is null
  and lower(s.email) = c.email_normalized;

insert into public.contact_events (contact_id, event_type, event_data, created_at)
select
  s.contact_id,
  'submission',
  jsonb_build_object(
    'submission_id',
    s.id,
    'source',
    s.source,
    'status',
    s.status
  ),
  s.created_at
from public.interest_submissions s
where s.contact_id is not null
  and not exists (
    select 1
    from public.contact_events e
    where e.event_type = 'submission'
      and e.event_data ->> 'submission_id' = s.id::text
  );
