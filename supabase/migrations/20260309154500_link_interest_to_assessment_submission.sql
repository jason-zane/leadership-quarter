alter table public.interest_submissions
  add column if not exists assessment_submission_id uuid
  references public.assessment_submissions (id) on delete set null;

create index if not exists idx_interest_submissions_assessment_submission_id
  on public.interest_submissions (assessment_submission_id);
