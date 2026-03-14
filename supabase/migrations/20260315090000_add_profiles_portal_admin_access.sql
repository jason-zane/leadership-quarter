alter table public.profiles
  add column if not exists portal_admin_access boolean not null default false;

create index if not exists idx_profiles_portal_admin_access
  on public.profiles (portal_admin_access)
  where portal_admin_access = true;
