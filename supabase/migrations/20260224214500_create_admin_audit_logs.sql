create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  action text not null,
  target_user_id uuid references auth.users (id) on delete set null,
  target_email text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_created_at
  on public.admin_audit_logs (created_at desc);
create index if not exists idx_admin_audit_logs_actor_user_id
  on public.admin_audit_logs (actor_user_id);
create index if not exists idx_admin_audit_logs_action
  on public.admin_audit_logs (action);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "No anonymous access" on public.admin_audit_logs;
create policy "No anonymous access"
  on public.admin_audit_logs
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.admin_audit_logs;
create policy "No authenticated direct access"
  on public.admin_audit_logs
  for all
  to authenticated
  using (false)
  with check (false);
