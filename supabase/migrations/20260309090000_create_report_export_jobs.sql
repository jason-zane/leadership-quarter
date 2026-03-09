create table if not exists public.report_export_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed')),
  report_type text not null,
  subject_ref text not null,
  requested_by text,
  storage_bucket text,
  storage_path text,
  template_version text not null default 'v1',
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  last_error text,
  run_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_report_export_jobs_status_run_at
  on public.report_export_jobs (status, run_at);

alter table public.report_export_jobs enable row level security;

drop policy if exists "No anonymous access" on public.report_export_jobs;
create policy "No anonymous access"
  on public.report_export_jobs
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "Authenticated read own table via app logic" on public.report_export_jobs;
create policy "Authenticated read own table via app logic"
  on public.report_export_jobs
  for select
  to authenticated
  using (false);
