-- V2 block-based report templates
create table if not exists public.v2_report_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  template_definition jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Link from assessments to templates (by reference or inline)
alter table public.assessments
  add column if not exists v2_report_template_id uuid references public.v2_report_templates(id) on delete set null,
  add column if not exists v2_report_template jsonb;
