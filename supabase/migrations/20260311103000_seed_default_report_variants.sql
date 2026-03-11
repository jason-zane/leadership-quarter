with candidate_assessments as (
  select
    a.id,
    a.key,
    a.created_by,
    coalesce(a.scoring_config, '{}'::jsonb) as scoring_config,
    coalesce(a.report_config, '{}'::jsonb) as report_config
  from public.assessments a
  where not exists (
    select 1
    from public.assessment_report_variants arv
    where arv.assessment_id = a.id
  )
),
generic_definition as (
  select id
  from public.report_definitions
  where key = 'generic_assessment'
  limit 1
)
insert into public.assessment_report_variants (
  id,
  assessment_id,
  report_definition_id,
  variant_key,
  name,
  version,
  status,
  is_default,
  scoring_config,
  report_config,
  compatibility_snapshot,
  created_by,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  ca.id,
  gd.id,
  'default_assessment_report',
  case
    when ca.key = 'ai_readiness_orientation_v1' then 'Generic assessment report'
    else 'Default assessment report'
  end,
  1,
  case
    when jsonb_array_length(coalesce(ca.scoring_config -> 'dimensions', '[]'::jsonb)) > 0 then 'published'
    else 'draft'
  end,
  case
    when ca.key <> 'ai_readiness_orientation_v1'
      and jsonb_array_length(coalesce(ca.scoring_config -> 'dimensions', '[]'::jsonb)) > 0
      then true
    else false
  end,
  ca.scoring_config,
  ca.report_config,
  jsonb_build_object(
    'compatible',
    jsonb_array_length(coalesce(ca.scoring_config -> 'dimensions', '[]'::jsonb)) > 0,
    'reason',
    case
      when jsonb_array_length(coalesce(ca.scoring_config -> 'dimensions', '[]'::jsonb)) > 0
        then 'Assessment has scoreable dimensions.'
      else 'Assessment has no configured scoreable dimensions yet.'
    end
  ),
  ca.created_by,
  now(),
  now()
from candidate_assessments ca
cross join generic_definition gd;

with orientation_candidates as (
  select
    a.id,
    a.created_by,
    coalesce(a.scoring_config, '{}'::jsonb) as scoring_config,
    coalesce(a.report_config, '{}'::jsonb) as report_config
  from public.assessments a
  where a.key = 'ai_readiness_orientation_v1'
    and exists (
      select 1
      from jsonb_array_elements(coalesce(a.scoring_config -> 'dimensions', '[]'::jsonb)) as dim
      where dim ->> 'key' = 'openness'
    )
    and exists (
      select 1
      from jsonb_array_elements(coalesce(a.scoring_config -> 'dimensions', '[]'::jsonb)) as dim
      where dim ->> 'key' = 'riskPosture'
    )
    and exists (
      select 1
      from jsonb_array_elements(coalesce(a.scoring_config -> 'dimensions', '[]'::jsonb)) as dim
      where dim ->> 'key' = 'capability'
    )
    and not exists (
      select 1
      from public.assessment_report_variants arv
      where arv.assessment_id = a.id
        and arv.variant_key = 'ai_orientation_report'
    )
),
ai_definition as (
  select id
  from public.report_definitions
  where key = 'ai_orientation'
  limit 1
)
insert into public.assessment_report_variants (
  id,
  assessment_id,
  report_definition_id,
  variant_key,
  name,
  version,
  status,
  is_default,
  scoring_config,
  report_config,
  compatibility_snapshot,
  created_by,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  oc.id,
  ad.id,
  'ai_orientation_report',
  'AI orientation report',
  1,
  'published',
  true,
  oc.scoring_config,
  oc.report_config,
  jsonb_build_object(
    'compatible',
    true,
    'reason',
    'Assessment has the AI orientation dimensions required for the orientation report.'
  ),
  oc.created_by,
  now(),
  now()
from orientation_candidates oc
cross join ai_definition ad;
