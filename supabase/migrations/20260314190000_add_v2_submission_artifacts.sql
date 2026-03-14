alter table public.assessment_submissions
  add column if not exists v2_runtime_metadata jsonb not null default '{}'::jsonb;

alter table public.assessment_submissions
  add column if not exists v2_submission_result jsonb not null default '{}'::jsonb;

alter table public.assessment_submissions
  add column if not exists v2_report_context jsonb not null default '{}'::jsonb;
