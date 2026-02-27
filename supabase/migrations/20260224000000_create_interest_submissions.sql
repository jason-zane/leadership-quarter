create table if not exists public.interest_submissions (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  source text,
  ip_address text,
  user_agent text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists idx_interest_submissions_created_at
  on public.interest_submissions (created_at desc);

create index if not exists idx_interest_submissions_email_lower
  on public.interest_submissions ((lower(email)));

alter table public.interest_submissions enable row level security;

drop policy if exists "No anonymous access" on public.interest_submissions;
create policy "No anonymous access"
  on public.interest_submissions
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "Authenticated read own table via app logic" on public.interest_submissions;
create policy "Authenticated read own table via app logic"
  on public.interest_submissions
  for select
  to authenticated
  using (false);
