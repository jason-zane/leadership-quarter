create table if not exists public.campaign_flow_steps (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  step_type text not null check (step_type in ('assessment', 'screen')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  campaign_assessment_id uuid references public.campaign_assessments(id) on delete cascade,
  screen_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaign_flow_steps_campaign_id
  on public.campaign_flow_steps (campaign_id, sort_order);

create unique index if not exists idx_campaign_flow_steps_campaign_assessment_id
  on public.campaign_flow_steps (campaign_assessment_id)
  where campaign_assessment_id is not null;

alter table public.campaign_flow_steps enable row level security;

drop policy if exists "No anonymous access" on public.campaign_flow_steps;
create policy "No anonymous access"
  on public.campaign_flow_steps
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.campaign_flow_steps;
create policy "No authenticated direct access"
  on public.campaign_flow_steps
  for all
  to authenticated
  using (false)
  with check (false);

insert into public.campaign_flow_steps (
  campaign_id,
  step_type,
  sort_order,
  is_active,
  campaign_assessment_id,
  screen_config
)
select
  ca.campaign_id,
  'assessment',
  ca.sort_order,
  ca.is_active,
  ca.id,
  '{}'::jsonb
from public.campaign_assessments ca
where not exists (
  select 1
  from public.campaign_flow_steps cfs
  where cfs.campaign_assessment_id = ca.id
);
