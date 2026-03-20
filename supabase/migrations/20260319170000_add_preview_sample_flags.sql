alter table public.assessment_submissions
  add column if not exists is_preview_sample boolean not null default false,
  add column if not exists preview_sample_key text;

create index if not exists idx_assessment_submissions_preview_scope
  on public.assessment_submissions (assessment_id, is_preview_sample, created_at desc);

update public.assessment_submissions
set
  is_preview_sample = true,
  preview_sample_key = coalesce(
    preview_sample_key,
    nullif(replace(split_part(email, '@', 1), '.', '_'), '')
  ),
  excluded_from_analysis = true,
  excluded_from_analysis_at = coalesce(excluded_from_analysis_at, now()),
  excluded_from_analysis_reason = coalesce(excluded_from_analysis_reason, 'preview_sample'),
  v2_report_context = '{}'::jsonb
where email like '%@lq-sample.internal';
