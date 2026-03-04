-- Stage 1: scoring engine config + scoring run metadata

alter table public.assessments
  add column if not exists scoring_engine text;

update public.assessments
set scoring_engine = 'rule_based'
where scoring_engine is null;

alter table public.assessments
  alter column scoring_engine set default 'rule_based';

alter table public.assessments
  alter column scoring_engine set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assessments_scoring_engine_check'
  ) then
    alter table public.assessments
      add constraint assessments_scoring_engine_check
      check (scoring_engine in ('rule_based', 'psychometric', 'hybrid'));
  end if;
end $$;

-- Preserve current AI readiness behavior while writing psychometric artifacts.
update public.assessments
set scoring_engine = 'hybrid'
where key = 'ai_readiness_orientation_v1';

alter table public.session_scores
  add column if not exists engine_type text;

update public.session_scores
set engine_type = 'psychometric'
where engine_type is null;

alter table public.session_scores
  alter column engine_type set default 'psychometric';

alter table public.session_scores
  alter column engine_type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'session_scores_engine_type_check'
  ) then
    alter table public.session_scores
      add constraint session_scores_engine_type_check
      check (engine_type in ('rule_based', 'psychometric', 'hybrid'));
  end if;
end $$;

alter table public.session_scores
  add column if not exists engine_version integer not null default 1;

alter table public.session_scores
  add column if not exists input_hash text;

create index if not exists idx_assessment_submissions_assessment_created_at
  on public.assessment_submissions (assessment_id, created_at desc);

create index if not exists idx_assessment_submissions_campaign_created_at
  on public.assessment_submissions (campaign_id, created_at desc);

create index if not exists idx_session_scores_submission_computed_at
  on public.session_scores (submission_id, computed_at desc);
