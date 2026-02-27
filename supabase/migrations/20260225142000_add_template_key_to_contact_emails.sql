alter table public.contact_emails
  add column if not exists template_key text references public.email_templates (key) on delete set null;

create index if not exists idx_contact_emails_template_key
  on public.contact_emails (template_key);
