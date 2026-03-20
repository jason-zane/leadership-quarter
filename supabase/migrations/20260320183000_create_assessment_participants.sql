create table if not exists public.assessment_participants (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts (id) on delete set null,
  email text,
  email_normalized text generated always as (lower(coalesce(email, ''))) stored,
  first_name text,
  last_name text,
  organisation text,
  role text,
  status text not null default 'active',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_participants_status_check check (status in ('active', 'archived'))
);

create unique index if not exists idx_assessment_participants_contact_unique
  on public.assessment_participants (contact_id)
  where contact_id is not null;

create index if not exists idx_assessment_participants_email_normalized
  on public.assessment_participants (email_normalized)
  where email is not null;

create index if not exists idx_assessment_participants_status
  on public.assessment_participants (status, updated_at desc);

alter table public.assessment_invitations
  add column if not exists participant_id uuid references public.assessment_participants (id) on delete set null;

alter table public.assessment_submissions
  add column if not exists participant_id uuid references public.assessment_participants (id) on delete set null;

create index if not exists idx_assessment_invitations_participant_id
  on public.assessment_invitations (participant_id);

create index if not exists idx_assessment_submissions_participant_id
  on public.assessment_submissions (participant_id);

insert into public.assessment_participants (
  contact_id,
  email,
  first_name,
  last_name,
  organisation,
  role
)
select distinct on (
  coalesce(ai.contact_id::text, ''),
  lower(coalesce(ai.email, '')),
  coalesce(ai.first_name, ''),
  coalesce(ai.last_name, '')
)
  ai.contact_id,
  ai.email,
  ai.first_name,
  ai.last_name,
  ai.organisation,
  ai.role
from public.assessment_invitations ai
where ai.contact_id is not null
   or nullif(trim(coalesce(ai.email, '')), '') is not null
on conflict do nothing;

insert into public.assessment_participants (
  contact_id,
  email,
  first_name,
  last_name,
  organisation,
  role
)
select distinct on (
  coalesce(s.contact_id::text, ''),
  lower(coalesce(s.email, '')),
  coalesce(s.first_name, ''),
  coalesce(s.last_name, '')
)
  s.contact_id,
  s.email,
  s.first_name,
  s.last_name,
  s.organisation,
  s.role
from public.assessment_submissions s
where s.contact_id is not null
   or nullif(trim(coalesce(s.email, '')), '') is not null
on conflict do nothing;

update public.assessment_invitations ai
set participant_id = ap.id
from public.assessment_participants ap
where ai.participant_id is null
  and (
    (ai.contact_id is not null and ap.contact_id = ai.contact_id)
    or (
      ai.contact_id is null
      and nullif(trim(coalesce(ai.email, '')), '') is not null
      and ap.contact_id is null
      and ap.email_normalized = lower(ai.email)
    )
  );

update public.assessment_submissions s
set participant_id = ap.id
from public.assessment_participants ap
where s.participant_id is null
  and (
    (s.contact_id is not null and ap.contact_id = s.contact_id)
    or (
      s.contact_id is null
      and nullif(trim(coalesce(s.email, '')), '') is not null
      and ap.contact_id is null
      and ap.email_normalized = lower(s.email)
    )
  );
