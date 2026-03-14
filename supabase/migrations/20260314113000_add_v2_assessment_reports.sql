create table if not exists public.v2_assessment_reports (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  name text not null,
  audience_role text not null check (audience_role in ('candidate', 'practitioner', 'internal', 'client')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_default boolean not null default false,
  sort_order integer not null default 0,
  template_definition jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_v2_assessment_reports_assessment
  on public.v2_assessment_reports (assessment_id, sort_order, updated_at desc);

create unique index if not exists idx_v2_assessment_reports_default
  on public.v2_assessment_reports (assessment_id)
  where is_default = true and status = 'published';
