alter table public.campaign_assessments
  add column if not exists report_overrides jsonb not null default '{}'::jsonb;
