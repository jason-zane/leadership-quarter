-- organisations

create table if not exists public.organisations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  website     text,
  status      text not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint organisations_status_check check (status in ('active', 'archived'))
);

create index if not exists idx_organisations_slug on public.organisations (slug);
create index if not exists idx_organisations_status on public.organisations (status);

alter table public.organisations enable row level security;
drop policy if exists "No anonymous access" on public.organisations;
create policy "No anonymous access"
  on public.organisations for all to anon
  using (false) with check (false);
drop policy if exists "No authenticated direct access" on public.organisations;
create policy "No authenticated direct access"
  on public.organisations for all to authenticated
  using (false) with check (false);

-- campaigns

create table if not exists public.campaigns (
  id               uuid primary key default gen_random_uuid(),
  survey_id        uuid not null references public.surveys (id) on delete cascade,
  organisation_id  uuid references public.organisations (id) on delete set null,
  name             text not null,
  slug             text not null unique,
  status           text not null default 'draft',
  config           jsonb not null default '{}'::jsonb,
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint campaigns_status_check check (status in ('draft', 'active', 'closed', 'archived'))
);

create index if not exists idx_campaigns_survey_id on public.campaigns (survey_id);
create index if not exists idx_campaigns_organisation_id on public.campaigns (organisation_id);
create index if not exists idx_campaigns_slug on public.campaigns (slug);
create index if not exists idx_campaigns_status on public.campaigns (status);

alter table public.campaigns enable row level security;
drop policy if exists "No anonymous access" on public.campaigns;
create policy "No anonymous access"
  on public.campaigns for all to anon
  using (false) with check (false);
drop policy if exists "No authenticated direct access" on public.campaigns;
create policy "No authenticated direct access"
  on public.campaigns for all to authenticated
  using (false) with check (false);

-- FK columns on survey_invitations and survey_submissions

alter table public.survey_invitations
  add column if not exists campaign_id uuid references public.campaigns (id) on delete set null;

alter table public.survey_submissions
  add column if not exists campaign_id uuid references public.campaigns (id) on delete set null;

alter table public.survey_submissions
  add column if not exists demographics jsonb;

create index if not exists idx_survey_invitations_campaign_id on public.survey_invitations (campaign_id);
create index if not exists idx_survey_submissions_campaign_id on public.survey_submissions (campaign_id);
