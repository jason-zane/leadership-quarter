insert into public.submission_forms (key, name, status, schema_version)
values ('report_download_ai_readiness_v1', 'AI Readiness Report Download', 'active', 1)
on conflict (key) do update
set
  name = excluded.name,
  status = excluded.status,
  schema_version = excluded.schema_version,
  updated_at = now();

insert into public.submission_field_definitions (
  form_key,
  field_key,
  label,
  field_type,
  required,
  sensitive,
  options,
  sort_order,
  is_active
)
values
  ('report_download_ai_readiness_v1', 'first_name', 'First Name', 'text', true, false, null, 10, true),
  ('report_download_ai_readiness_v1', 'last_name', 'Last Name', 'text', true, false, null, 20, true),
  ('report_download_ai_readiness_v1', 'email', 'Email', 'text', true, false, null, 30, true),
  ('report_download_ai_readiness_v1', 'organisation', 'Organisation', 'text', true, false, null, 40, true),
  ('report_download_ai_readiness_v1', 'role', 'Role', 'text', true, false, null, 50, true),
  ('report_download_ai_readiness_v1', 'consent', 'Consent', 'boolean', true, false, null, 60, true)
on conflict (form_key, field_key) do update
set
  label = excluded.label,
  field_type = excluded.field_type,
  required = excluded.required,
  sensitive = excluded.sensitive,
  options = excluded.options,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.email_templates (
  key,
  slug,
  name,
  description,
  subject,
  html_body,
  text_body,
  category,
  status,
  channel
)
values
  (
    'ai_readiness_report_internal_notification',
    'ai-readiness-report-internal-notification',
    'AI Readiness Report Internal Notification',
    'Sent to internal notification inbox when AI Readiness report is requested.',
    'AI Readiness report download: {{first_name}} {{last_name}}',
    '<h2>AI Readiness & Enablement Report Download Request</h2><p><strong>Name:</strong> {{first_name}} {{last_name}}</p><p><strong>Email:</strong> {{email}}</p><p><strong>Organisation:</strong> {{organisation}}</p><p><strong>Role:</strong> {{role}}</p><p><strong>Source:</strong> {{source}}</p>',
    'AI Readiness & Enablement Report Download Request\n\nName: {{first_name}} {{last_name}}\nEmail: {{email}}\nOrganisation: {{organisation}}\nRole: {{role}}\nSource: {{source}}',
    'operations',
    'active',
    'email'
  ),
  (
    'ai_readiness_report_user_confirmation',
    'ai-readiness-report-user-confirmation',
    'AI Readiness Report User Confirmation',
    'Sent to user after requesting AI Readiness report.',
    'Your AI Readiness & Enablement framework download',
    '<p>Hi {{first_name}},</p><p>Thanks for requesting the AI Readiness & Enablement framework. Your download is ready from the page you submitted.</p><p>If you would like help applying the model to your team, reply to this email.</p><p>Leadership Quarter</p>',
    'Hi {{first_name}},\n\nThanks for requesting the AI Readiness & Enablement framework. Your download is ready from the page you submitted.\nIf you would like help applying the model to your team, reply to this email.\n\nLeadership Quarter',
    'operations',
    'active',
    'email'
  )
on conflict (key) do update
set
  slug = excluded.slug,
  name = excluded.name,
  description = excluded.description,
  subject = excluded.subject,
  html_body = excluded.html_body,
  text_body = excluded.text_body,
  category = excluded.category,
  status = excluded.status,
  channel = excluded.channel,
  updated_at = now();

insert into public.email_template_usages (usage_key, usage_name, description, route_hint, template_key)
values
  (
    'ai_readiness_report.internal_notification',
    'AI Readiness Report - Internal Notification',
    'Sent to RESEND_NOTIFICATION_TO when AI Readiness report download is requested.',
    '/api/reports/ai-readiness/request-download',
    'ai_readiness_report_internal_notification'
  ),
  (
    'ai_readiness_report.user_confirmation',
    'AI Readiness Report - User Confirmation',
    'Sent to user after AI Readiness report request.',
    '/api/reports/ai-readiness/request-download',
    'ai_readiness_report_user_confirmation'
  )
on conflict (usage_key) do update
set
  usage_name = excluded.usage_name,
  description = excluded.description,
  route_hint = excluded.route_hint,
  template_key = excluded.template_key,
  updated_at = now();

insert into public.email_template_versions (
  template_key,
  version,
  subject,
  html_body,
  text_body,
  change_note
)
select
  t.key,
  1,
  t.subject,
  t.html_body,
  t.text_body,
  'Initial version backfill'
from public.email_templates t
where t.key in (
  'ai_readiness_report_internal_notification',
  'ai_readiness_report_user_confirmation'
)
and not exists (
  select 1
  from public.email_template_versions v
  where v.template_key = t.key
);
