insert into public.submission_forms (key, name, status, schema_version)
values
  ('inquiry_work_with_us_v1', 'Work With Us Inquiry', 'active', 1),
  ('report_download_lq8_v1', 'LQ8 Report Download', 'active', 1)
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
  ('inquiry_work_with_us_v1', 'first_name', 'First Name', 'text', true, false, null, 10, true),
  ('inquiry_work_with_us_v1', 'last_name', 'Last Name', 'text', true, false, null, 20, true),
  ('inquiry_work_with_us_v1', 'email', 'Email', 'text', true, false, null, 30, true),
  ('inquiry_work_with_us_v1', 'organisation', 'Organisation', 'text', true, false, null, 40, true),
  ('inquiry_work_with_us_v1', 'role', 'Role', 'text', false, false, null, 50, true),
  ('inquiry_work_with_us_v1', 'topic', 'Topic', 'select', false, false, '["Executive Search","Leadership Assessment","Succession Strategy","AI Readiness","LQ8 Framework","Other"]'::jsonb, 60, true),
  ('inquiry_work_with_us_v1', 'message', 'Inquiry Message', 'textarea', true, false, null, 70, true),
  ('inquiry_work_with_us_v1', 'consent', 'Consent', 'boolean', true, false, null, 80, true),

  ('report_download_lq8_v1', 'first_name', 'First Name', 'text', true, false, null, 10, true),
  ('report_download_lq8_v1', 'last_name', 'Last Name', 'text', true, false, null, 20, true),
  ('report_download_lq8_v1', 'email', 'Email', 'text', true, false, null, 30, true),
  ('report_download_lq8_v1', 'organisation', 'Organisation', 'text', true, false, null, 40, true),
  ('report_download_lq8_v1', 'role', 'Role', 'text', true, false, null, 50, true),
  ('report_download_lq8_v1', 'consent', 'Consent', 'boolean', true, false, null, 60, true)
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
    'inquiry_internal_notification',
    'inquiry-internal-notification',
    'Inquiry Internal Notification',
    'Sent to internal notification inbox when a work-with-us inquiry is submitted.',
    'New inquiry: {{first_name}} {{last_name}}',
    '<h2>New Inquiry</h2><p><strong>Name:</strong> {{first_name}} {{last_name}}</p><p><strong>Email:</strong> {{email}}</p><p><strong>Organisation:</strong> {{organisation}}</p><p><strong>Role:</strong> {{role}}</p><p><strong>Topic:</strong> {{topic}}</p><p><strong>Message:</strong></p><p>{{message}}</p><p><strong>Source:</strong> {{source}}</p>',
    'New Inquiry\n\nName: {{first_name}} {{last_name}}\nEmail: {{email}}\nOrganisation: {{organisation}}\nRole: {{role}}\nTopic: {{topic}}\nMessage: {{message}}\nSource: {{source}}',
    'operations',
    'active',
    'email'
  ),
  (
    'inquiry_user_confirmation',
    'inquiry-user-confirmation',
    'Inquiry User Confirmation',
    'Sent to user after submitting work-with-us inquiry.',
    'Thanks for contacting Leadership Quarter',
    '<p>Hi {{first_name}},</p><p>Thanks for your inquiry. We have received your details and will respond shortly.</p><p>Leadership Quarter</p>',
    'Hi {{first_name}},\n\nThanks for your inquiry. We have received your details and will respond shortly.\n\nLeadership Quarter',
    'operations',
    'active',
    'email'
  ),
  (
    'lq8_report_internal_notification',
    'lq8-report-internal-notification',
    'LQ8 Report Internal Notification',
    'Sent to internal notification inbox when LQ8 report is requested.',
    'LQ8 report download: {{first_name}} {{last_name}}',
    '<h2>LQ8 Report Download Request</h2><p><strong>Name:</strong> {{first_name}} {{last_name}}</p><p><strong>Email:</strong> {{email}}</p><p><strong>Organisation:</strong> {{organisation}}</p><p><strong>Role:</strong> {{role}}</p><p><strong>Source:</strong> {{source}}</p>',
    'LQ8 Report Download Request\n\nName: {{first_name}} {{last_name}}\nEmail: {{email}}\nOrganisation: {{organisation}}\nRole: {{role}}\nSource: {{source}}',
    'operations',
    'active',
    'email'
  ),
  (
    'lq8_report_user_confirmation',
    'lq8-report-user-confirmation',
    'LQ8 Report User Confirmation',
    'Sent to user after requesting LQ8 report.',
    'Your LQ8 report download',
    '<p>Hi {{first_name}},</p><p>Thanks for requesting the LQ8 report. Your download is ready from the page you submitted.</p><p>If you need support applying the framework, reply to this email.</p><p>Leadership Quarter</p>',
    'Hi {{first_name}},\n\nThanks for requesting the LQ8 report. Your download is ready from the page you submitted.\nIf you need support applying the framework, reply to this email.\n\nLeadership Quarter',
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
    'inquiry.internal_notification',
    'Inquiry - Internal Notification',
    'Sent to RESEND_NOTIFICATION_TO when a new inquiry is submitted.',
    '/api/inquiry',
    'inquiry_internal_notification'
  ),
  (
    'inquiry.user_confirmation',
    'Inquiry - User Confirmation',
    'Sent to user after inquiry submission.',
    '/api/inquiry',
    'inquiry_user_confirmation'
  ),
  (
    'lq8_report.internal_notification',
    'LQ8 Report - Internal Notification',
    'Sent to RESEND_NOTIFICATION_TO when report download is requested.',
    '/api/reports/lq8/request-download',
    'lq8_report_internal_notification'
  ),
  (
    'lq8_report.user_confirmation',
    'LQ8 Report - User Confirmation',
    'Sent to user after report request.',
    '/api/reports/lq8/request-download',
    'lq8_report_user_confirmation'
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
  'inquiry_internal_notification',
  'inquiry_user_confirmation',
  'lq8_report_internal_notification',
  'lq8_report_user_confirmation'
)
and not exists (
  select 1
  from public.email_template_versions v
  where v.template_key = t.key
);

insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;
