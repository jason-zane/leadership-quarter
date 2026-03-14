alter table public.v2_assessment_reports
  add column if not exists report_kind text not null default 'audience',
  add column if not exists base_report_id uuid null references public.v2_assessment_reports(id) on delete set null,
  add column if not exists override_definition jsonb not null default '{}'::jsonb;

alter table public.v2_assessment_reports
  drop constraint if exists v2_assessment_reports_audience_role_check;

alter table public.v2_assessment_reports
  add constraint v2_assessment_reports_audience_role_check
  check (audience_role in ('candidate', 'practitioner', 'internal', 'client', 'base'));

alter table public.v2_assessment_reports
  drop constraint if exists v2_assessment_reports_report_kind_check;

alter table public.v2_assessment_reports
  add constraint v2_assessment_reports_report_kind_check
  check (report_kind in ('base', 'audience'));

create index if not exists idx_v2_assessment_reports_base_report
  on public.v2_assessment_reports (base_report_id);

create unique index if not exists idx_v2_assessment_reports_single_base
  on public.v2_assessment_reports (assessment_id)
  where report_kind = 'base';
