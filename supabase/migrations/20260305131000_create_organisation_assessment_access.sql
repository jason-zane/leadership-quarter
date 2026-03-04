create table if not exists public.organisation_assessment_access (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  enabled boolean not null default true,
  config_override jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organisation_assessment_access_org_assessment_unique
    unique (organisation_id, assessment_id)
);

create index if not exists idx_org_assessment_access_org_enabled
  on public.organisation_assessment_access (organisation_id, enabled);

create index if not exists idx_org_assessment_access_assessment_id
  on public.organisation_assessment_access (assessment_id);

alter table public.organisation_assessment_access enable row level security;

drop policy if exists "No anonymous access" on public.organisation_assessment_access;
create policy "No anonymous access"
  on public.organisation_assessment_access
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.organisation_assessment_access;
create policy "No authenticated direct access"
  on public.organisation_assessment_access
  for all
  to authenticated
  using (false)
  with check (false);
