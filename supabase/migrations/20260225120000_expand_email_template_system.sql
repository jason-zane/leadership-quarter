alter table public.email_templates
  add column if not exists slug text,
  add column if not exists category text not null default 'operations',
  add column if not exists status text not null default 'active',
  add column if not exists channel text not null default 'email',
  add column if not exists updated_by_user_id uuid references auth.users (id) on delete set null;

update public.email_templates
set slug = key
where slug is null;

create unique index if not exists idx_email_templates_slug_unique
  on public.email_templates (lower(slug));

create table if not exists public.email_template_usages (
  usage_key text primary key,
  usage_name text not null,
  description text,
  route_hint text,
  template_key text references public.email_templates (key) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_email_template_usages_template_key
  on public.email_template_usages (template_key);

alter table public.email_template_usages enable row level security;

drop policy if exists "No anonymous access" on public.email_template_usages;
create policy "No anonymous access"
  on public.email_template_usages
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.email_template_usages;
create policy "No authenticated direct access"
  on public.email_template_usages
  for all
  to authenticated
  using (false)
  with check (false);

insert into public.email_template_usages (usage_key, usage_name, description, route_hint, template_key)
values
  (
    'register_interest.internal_notification',
    'Interest Form - Internal Notification',
    'Sent to operations when a new interest form is submitted.',
    '/api/register-interest',
    'interest_internal_notification'
  ),
  (
    'register_interest.user_confirmation',
    'Interest Form - User Confirmation',
    'Sent to the user after submitting the interest form.',
    '/api/register-interest',
    'interest_user_confirmation'
  )
on conflict (usage_key) do update
set
  usage_name = excluded.usage_name,
  description = excluded.description,
  route_hint = excluded.route_hint,
  template_key = excluded.template_key,
  updated_at = now();

create table if not exists public.email_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_key text not null references public.email_templates (key) on delete cascade,
  version integer not null,
  subject text not null,
  html_body text not null,
  text_body text,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  change_note text
);

create unique index if not exists idx_email_template_versions_template_version
  on public.email_template_versions (template_key, version);
create index if not exists idx_email_template_versions_template_key
  on public.email_template_versions (template_key);
create index if not exists idx_email_template_versions_created_at
  on public.email_template_versions (created_at desc);

alter table public.email_template_versions enable row level security;

drop policy if exists "No anonymous access" on public.email_template_versions;
create policy "No anonymous access"
  on public.email_template_versions
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.email_template_versions;
create policy "No authenticated direct access"
  on public.email_template_versions
  for all
  to authenticated
  using (false)
  with check (false);

insert into public.email_template_versions (
  template_key,
  version,
  subject,
  html_body,
  text_body,
  change_note
)
select
  t.key,
  1,
  t.subject,
  t.html_body,
  t.text_body,
  'Initial version backfill'
from public.email_templates t
where not exists (
  select 1
  from public.email_template_versions v
  where v.template_key = t.key
);
