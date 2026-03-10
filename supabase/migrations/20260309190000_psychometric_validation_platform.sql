alter table public.assessments
  add column if not exists approved_analysis_run_id uuid;

create table if not exists public.dimension_norm_stats (
  id uuid primary key default gen_random_uuid(),
  norm_group_id uuid not null references public.norm_groups(id) on delete cascade,
  dimension_id uuid not null references public.assessment_dimensions(id) on delete cascade,
  mean float not null,
  sd float not null,
  p10 float,
  p25 float,
  p50 float,
  p75 float,
  p90 float,
  min float,
  max float,
  computed_at timestamptz not null default now(),
  unique (norm_group_id, dimension_id)
);

create table if not exists public.psychometric_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  norm_group_id uuid references public.norm_groups(id) on delete set null,
  analysis_type text not null check (analysis_type in ('efa', 'cfa', 'invariance', 'full_validation')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'approved', 'superseded')),
  grouping_variable text,
  sample_n int not null default 0,
  minimum_sample_n int,
  input_snapshot jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  error_message text,
  requested_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  approved_at timestamptz
);

create table if not exists public.psychometric_scale_diagnostics (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null references public.psychometric_analysis_runs(id) on delete cascade,
  scale_key text not null,
  scale_label text not null,
  source text not null check (source in ('trait_mapped', 'legacy_dimension')),
  item_count int not null default 0,
  complete_n int not null default 0,
  alpha float,
  alpha_ci_lower float,
  alpha_ci_upper float,
  sem float,
  missing_rate float,
  metadata jsonb not null default '{}'::jsonb,
  unique (analysis_run_id, scale_key, source)
);

create table if not exists public.psychometric_item_diagnostics (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null references public.psychometric_analysis_runs(id) on delete cascade,
  scale_key text not null,
  question_id uuid references public.assessment_questions(id) on delete set null,
  question_key text not null,
  item_label text not null,
  source text not null check (source in ('trait_mapped', 'legacy_dimension')),
  reverse_scored boolean not null default false,
  mean float,
  sd float,
  missing_rate float,
  floor_pct float,
  ceiling_pct float,
  citc float,
  alpha_if_deleted float,
  metadata jsonb not null default '{}'::jsonb,
  unique (analysis_run_id, scale_key, question_key, source)
);

create table if not exists public.psychometric_factor_models (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null references public.psychometric_analysis_runs(id) on delete cascade,
  model_kind text not null check (model_kind in ('efa', 'cfa', 'invariance')),
  model_name text not null,
  factor_count int not null default 0,
  rotation text,
  extraction_method text,
  grouping_variable text,
  group_key text,
  adequacy jsonb not null default '{}'::jsonb,
  fit_indices jsonb not null default '{}'::jsonb,
  factor_correlations jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.psychometric_factor_loadings (
  id uuid primary key default gen_random_uuid(),
  factor_model_id uuid not null references public.psychometric_factor_models(id) on delete cascade,
  scale_key text not null,
  question_id uuid references public.assessment_questions(id) on delete set null,
  question_key text not null,
  factor_key text not null,
  loading float,
  standardized_loading float,
  communality float,
  uniqueness float,
  cross_loading boolean not null default false,
  retained boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  unique (factor_model_id, question_key, factor_key)
);

create table if not exists public.psychometric_model_recommendations (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null references public.psychometric_analysis_runs(id) on delete cascade,
  scope text not null check (scope in ('assessment', 'scale', 'item', 'model')),
  target_key text,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  code text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assessments_approved_analysis_run_fk'
  ) then
    alter table public.assessments
      add constraint assessments_approved_analysis_run_fk
      foreign key (approved_analysis_run_id)
      references public.psychometric_analysis_runs(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_dimension_norm_stats_norm_group_id
  on public.dimension_norm_stats (norm_group_id);

create index if not exists idx_psychometric_analysis_runs_assessment_status
  on public.psychometric_analysis_runs (assessment_id, status, created_at desc);

create index if not exists idx_psychometric_analysis_runs_status_run_at
  on public.psychometric_analysis_runs (status, created_at desc);

create index if not exists idx_psychometric_scale_diagnostics_run_id
  on public.psychometric_scale_diagnostics (analysis_run_id);

create index if not exists idx_psychometric_item_diagnostics_run_id
  on public.psychometric_item_diagnostics (analysis_run_id);

create index if not exists idx_psychometric_factor_models_run_id
  on public.psychometric_factor_models (analysis_run_id);

create index if not exists idx_psychometric_factor_loadings_model_id
  on public.psychometric_factor_loadings (factor_model_id);

create index if not exists idx_psychometric_model_recommendations_run_id
  on public.psychometric_model_recommendations (analysis_run_id);

alter table public.dimension_norm_stats enable row level security;
alter table public.psychometric_analysis_runs enable row level security;
alter table public.psychometric_scale_diagnostics enable row level security;
alter table public.psychometric_item_diagnostics enable row level security;
alter table public.psychometric_factor_models enable row level security;
alter table public.psychometric_factor_loadings enable row level security;
alter table public.psychometric_model_recommendations enable row level security;

create policy "deny_all_dimension_norm_stats" on public.dimension_norm_stats
  for all to anon, authenticated using (false);
create policy "deny_all_psychometric_analysis_runs" on public.psychometric_analysis_runs
  for all to anon, authenticated using (false);
create policy "deny_all_psychometric_scale_diagnostics" on public.psychometric_scale_diagnostics
  for all to anon, authenticated using (false);
create policy "deny_all_psychometric_item_diagnostics" on public.psychometric_item_diagnostics
  for all to anon, authenticated using (false);
create policy "deny_all_psychometric_factor_models" on public.psychometric_factor_models
  for all to anon, authenticated using (false);
create policy "deny_all_psychometric_factor_loadings" on public.psychometric_factor_loadings
  for all to anon, authenticated using (false);
create policy "deny_all_psychometric_model_recommendations" on public.psychometric_model_recommendations
  for all to anon, authenticated using (false);
