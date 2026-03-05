alter table public.assessments
  add column if not exists runner_config jsonb not null default '{}'::jsonb;

alter table public.assessments
  add column if not exists report_config jsonb not null default '{}'::jsonb;

alter table public.campaigns
  add column if not exists runner_overrides jsonb not null default '{}'::jsonb;
