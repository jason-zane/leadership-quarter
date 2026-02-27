create table if not exists public.contact_emails (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  direction text not null default 'outbound',
  provider text not null default 'resend',
  provider_message_id text,
  subject text not null,
  text_body text,
  html_body text,
  sent_to_email text not null,
  sent_by_user_id uuid references auth.users (id) on delete set null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint contact_emails_direction_check check (direction in ('outbound', 'inbound'))
);

create index if not exists idx_contact_emails_contact_id on public.contact_emails (contact_id);
create index if not exists idx_contact_emails_sent_at on public.contact_emails (sent_at desc);
create index if not exists idx_contact_emails_sent_to on public.contact_emails (sent_to_email);

alter table public.contact_emails enable row level security;

drop policy if exists "No anonymous access" on public.contact_emails;
create policy "No anonymous access"
  on public.contact_emails
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.contact_emails;
create policy "No authenticated direct access"
  on public.contact_emails
  for all
  to authenticated
  using (false)
  with check (false);
