alter table public.assessments
  add column if not exists v2_question_bank jsonb not null default '{}'::jsonb;
