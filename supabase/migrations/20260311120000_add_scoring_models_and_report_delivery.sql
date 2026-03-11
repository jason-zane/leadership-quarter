create table if not exists public.assessment_scoring_models (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  model_key text not null,
  name text not null,
  mode text not null check (mode in ('rule_based', 'psychometric', 'hybrid')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_default boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  output_summary jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, model_key)
);

create unique index if not exists idx_assessment_scoring_models_default
  on public.assessment_scoring_models (assessment_id)
  where is_default = true and status <> 'archived';

create index if not exists idx_assessment_scoring_models_assessment
  on public.assessment_scoring_models (assessment_id, status, model_key);

alter table public.assessment_report_variants
  add column if not exists scoring_model_id uuid references public.assessment_scoring_models(id) on delete set null;

alter table public.campaign_assessments
  add column if not exists report_delivery_config jsonb not null default '{}'::jsonb;

with seeded_models as (
  select
    a.id as assessment_id,
    coalesce(nullif(a.scoring_engine, ''), 'rule_based') as mode,
    coalesce(a.scoring_config, '{}'::jsonb) as config,
    a.created_by
  from public.assessments a
  where not exists (
    select 1
    from public.assessment_scoring_models asm
    where asm.assessment_id = a.id
  )
)
insert into public.assessment_scoring_models (
  id,
  assessment_id,
  model_key,
  name,
  mode,
  status,
  is_default,
  config,
  output_summary,
  created_by,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  sm.assessment_id,
  'core_scoring_model',
  case sm.mode
    when 'psychometric' then 'Psychometric scoring model'
    when 'hybrid' then 'Hybrid scoring model'
    else 'Core scoring model'
  end,
  sm.mode,
  case
    when jsonb_array_length(coalesce(sm.config -> 'dimensions', '[]'::jsonb)) > 0 then 'published'
    else 'draft'
  end,
  true,
  sm.config,
  jsonb_build_object(
    'competency_count', jsonb_array_length(coalesce(sm.config -> 'dimensions', '[]'::jsonb)),
    'classification_count', jsonb_array_length(coalesce(sm.config -> 'classifications', '[]'::jsonb)),
    'uses_matrix', jsonb_array_length(coalesce(sm.config -> 'classification_matrix', '[]'::jsonb)) > 0,
    'scale_points', coalesce((sm.config -> 'scale_config' ->> 'points')::integer, 5)
  ),
  sm.created_by,
  now(),
  now()
from seeded_models sm;

update public.assessment_report_variants arv
set scoring_model_id = asm.id
from public.assessment_scoring_models asm
where arv.assessment_id = asm.assessment_id
  and asm.is_default = true
  and arv.scoring_model_id is null;

update public.campaign_assessments ca
set report_delivery_config = jsonb_build_object(
  'public_default_report_variant_id',
  coalesce(
    nullif(ca.report_overrides ->> 'default_report_variant_id', ''),
    (
      select arv.id::text
      from public.assessment_report_variants arv
      where arv.assessment_id = ca.assessment_id
        and arv.status = 'published'
        and arv.is_default = true
      order by arv.updated_at desc
      limit 1
    )
  ),
  'internal_allowed_report_variant_ids',
  coalesce(
    (
      select jsonb_agg(arv.id::text order by arv.name)
      from public.assessment_report_variants arv
      where arv.assessment_id = ca.assessment_id
        and arv.status = 'published'
    ),
    '[]'::jsonb
  )
)
where coalesce(ca.report_delivery_config, '{}'::jsonb) = '{}'::jsonb;

alter table public.assessment_scoring_models enable row level security;

drop policy if exists "deny_all_assessment_scoring_models" on public.assessment_scoring_models;
create policy "deny_all_assessment_scoring_models"
  on public.assessment_scoring_models
  for all
  to anon, authenticated
  using (false);
