create table if not exists public.email_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  job_type text not null,
  payload jsonb not null,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  last_error text,
  run_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_email_jobs_status_run_at
  on public.email_jobs (status, run_at);

alter table public.email_jobs enable row level security;

drop policy if exists "No anonymous access" on public.email_jobs;
create policy "No anonymous access"
  on public.email_jobs
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "Authenticated read own table via app logic" on public.email_jobs;
create policy "Authenticated read own table via app logic"
  on public.email_jobs
  for select
  to authenticated
  using (false);
