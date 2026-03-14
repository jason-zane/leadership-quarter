alter table public.assessments
add column if not exists v2_scoring_config jsonb;
