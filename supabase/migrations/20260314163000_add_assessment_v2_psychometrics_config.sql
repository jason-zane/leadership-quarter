alter table public.assessments
add column if not exists v2_psychometrics_config jsonb;
