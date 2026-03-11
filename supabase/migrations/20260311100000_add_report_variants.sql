create table if not exists public.report_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  renderer_type text not null check (renderer_type in ('assessment', 'ai_survey')),
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  compatibility_rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assessment_report_variants (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  report_definition_id uuid not null references public.report_definitions(id) on delete restrict,
  variant_key text not null,
  name text not null,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_default boolean not null default false,
  scoring_config jsonb not null default '{}'::jsonb,
  report_config jsonb not null default '{}'::jsonb,
  compatibility_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, variant_key, version)
);

create unique index if not exists idx_assessment_report_variants_default
  on public.assessment_report_variants (assessment_id)
  where is_default = true and status = 'published';

create index if not exists idx_assessment_report_variants_assessment
  on public.assessment_report_variants (assessment_id, status, variant_key, version desc);

alter table public.assessment_submissions
  add column if not exists default_report_variant_id uuid references public.assessment_report_variants(id) on delete set null;

alter table public.assessment_submissions
  add column if not exists default_report_snapshot jsonb not null default '{}'::jsonb;

insert into public.report_definitions (key, name, description, renderer_type, status, compatibility_rules)
values
  (
    'generic_assessment',
    'Generic assessment report',
    'The standard generic assessment report built from assessment scores, dimensions, and recommendations.',
    'assessment',
    'active',
    '{"requires":["responses","scoring_config"]}'::jsonb
  ),
  (
    'ai_orientation',
    'AI orientation report',
    'The AI readiness orientation survey report derived from the same assessment submission when the required structure is present.',
    'ai_survey',
    'active',
    '{"requires":["responses","dimensions:openness,riskPosture,capability"]}'::jsonb
  )
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description,
  renderer_type = excluded.renderer_type,
  status = excluded.status,
  compatibility_rules = excluded.compatibility_rules,
  updated_at = now();

alter table public.report_definitions enable row level security;
alter table public.assessment_report_variants enable row level security;

drop policy if exists "deny_all_report_definitions" on public.report_definitions;
create policy "deny_all_report_definitions"
  on public.report_definitions
  for all
  to anon, authenticated
  using (false);

drop policy if exists "deny_all_assessment_report_variants" on public.assessment_report_variants;
create policy "deny_all_assessment_report_variants"
  on public.assessment_report_variants
  for all
  to anon, authenticated
  using (false);
