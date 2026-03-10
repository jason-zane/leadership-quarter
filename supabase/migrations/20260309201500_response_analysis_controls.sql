alter table public.assessment_submissions
  add column if not exists excluded_from_analysis boolean not null default false,
  add column if not exists excluded_from_analysis_at timestamptz,
  add column if not exists excluded_from_analysis_reason text;

create index if not exists idx_assessment_submissions_analysis_scope
  on public.assessment_submissions (assessment_id, excluded_from_analysis, created_at desc);
