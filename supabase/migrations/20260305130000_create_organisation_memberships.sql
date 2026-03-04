create table if not exists public.organisation_memberships (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null,
  status text not null default 'invited',
  invited_by uuid references auth.users (id) on delete set null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organisation_memberships_role_check
    check (role in ('org_owner', 'org_admin', 'campaign_manager', 'viewer')),
  constraint organisation_memberships_status_check
    check (status in ('invited', 'active', 'suspended')),
  constraint organisation_memberships_org_user_unique
    unique (organisation_id, user_id)
);

create index if not exists idx_org_memberships_user_id
  on public.organisation_memberships (user_id);

create index if not exists idx_org_memberships_org_role
  on public.organisation_memberships (organisation_id, role);

create index if not exists idx_org_memberships_org_status
  on public.organisation_memberships (organisation_id, status);

create unique index if not exists uq_org_memberships_single_active_per_user
  on public.organisation_memberships (user_id)
  where status in ('invited', 'active');

alter table public.organisation_memberships enable row level security;

drop policy if exists "No anonymous access" on public.organisation_memberships;
create policy "No anonymous access"
  on public.organisation_memberships
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.organisation_memberships;
create policy "No authenticated direct access"
  on public.organisation_memberships
  for all
  to authenticated
  using (false)
  with check (false);
