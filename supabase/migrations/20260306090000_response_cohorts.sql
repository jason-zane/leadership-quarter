create table response_cohorts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  name text not null,
  submission_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table response_cohorts enable row level security;

create policy "Service role bypass" on response_cohorts
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
