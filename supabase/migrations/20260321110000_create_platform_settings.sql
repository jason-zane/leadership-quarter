-- Platform-wide configuration settings, editable from the admin dashboard.
-- Each setting has a category + key composite primary key, a JSON value,
-- and audit metadata.
--
-- The service role client reads these at runtime and falls back to
-- compile-time defaults when a key is absent.

create table if not exists public.platform_settings (
  category  text        not null,
  key       text        not null,
  value     jsonb       not null default '{}',
  label     text        not null default '',
  description text      not null default '',
  updated_by uuid       references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (category, key)
);

alter table public.platform_settings enable row level security;

create policy "deny_all_platform_settings"
  on public.platform_settings
  for all
  to anon, authenticated
  using (false);

comment on table public.platform_settings is
  'Admin-editable platform configuration. Accessed only via service role.';
