create table if not exists public.email_templates (
  key text primary key,
  name text not null,
  description text,
  subject text not null,
  html_body text not null,
  text_body text,
  updated_at timestamptz not null default now()
);

insert into public.email_templates (key, name, description, subject, html_body, text_body)
values
  (
    'interest_internal_notification',
    'Internal Notification',
    'Sent to RESEND_NOTIFICATION_TO when someone submits the interest form.',
    'New interest registration: {{first_name}} {{last_name}}',
    '<h2>New Register Interest submission</h2>
<p><strong>Name:</strong> {{first_name}} {{last_name}}</p>
<p><strong>Email:</strong> {{email}}</p>
<p><strong>Source:</strong> {{source}}</p>',
    'New Register Interest submission

Name: {{first_name}} {{last_name}}
Email: {{email}}
Source: {{source}}'
  ),
  (
    'interest_user_confirmation',
    'User Confirmation',
    'Sent to the submitter email address after successful form submission.',
    'Thanks for registering your interest',
    '<p>Hi {{first_name}},</p>
<p>Thanks for registering your interest in Miles Between.</p>
<p>We will be in touch when dates and locations are confirmed.</p>',
    'Hi {{first_name}},

Thanks for registering your interest in Miles Between.
We will be in touch when dates and locations are confirmed.'
  )
on conflict (key) do nothing;

alter table public.email_templates enable row level security;

drop policy if exists "No anonymous access" on public.email_templates;
create policy "No anonymous access"
  on public.email_templates
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.email_templates;
create policy "No authenticated direct access"
  on public.email_templates
  for all
  to authenticated
  using (false)
  with check (false);
