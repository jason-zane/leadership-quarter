alter table public.site_cta_bindings
  drop constraint if exists site_cta_bindings_campaign_slug_fkey;

alter table public.campaigns
  drop constraint if exists campaigns_slug_key;

create unique index if not exists idx_campaigns_organisation_slug_unique
  on public.campaigns (organisation_id, slug);

create unique index if not exists idx_campaigns_lq_slug_unique
  on public.campaigns (slug)
  where organisation_id is null;

create index if not exists idx_campaigns_organisation_status_created_at
  on public.campaigns (organisation_id, status, created_at desc);
