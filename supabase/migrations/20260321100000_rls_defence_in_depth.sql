-- Defence-in-depth: Enable RLS and deny-all policies on tables that were
-- created without them.  The service_role client bypasses RLS, so existing
-- application code is unaffected.  These policies prevent accidental data
-- leakage if any future code path uses the anon or authenticated client.

-- v2_assessment_reports
alter table public.v2_assessment_reports enable row level security;
create policy "deny_all_v2_assessment_reports"
  on public.v2_assessment_reports
  for all
  to anon, authenticated
  using (false);

-- v2_report_templates
alter table public.v2_report_templates enable row level security;
create policy "deny_all_v2_report_templates"
  on public.v2_report_templates
  for all
  to anon, authenticated
  using (false);

-- assessment_participants
alter table public.assessment_participants enable row level security;
create policy "deny_all_assessment_participants"
  on public.assessment_participants
  for all
  to anon, authenticated
  using (false);
