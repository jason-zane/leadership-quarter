create table if not exists public.site_cta_bindings (
  slot text primary key,
  campaign_slug text references public.campaigns (slug) on update cascade on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint site_cta_bindings_slot_check check (
    slot in ('ai_readiness_orientation_primary', 'ai_readiness_orientation_secondary')
  )
);

alter table public.site_cta_bindings enable row level security;

drop policy if exists "No anonymous access" on public.site_cta_bindings;
create policy "No anonymous access"
  on public.site_cta_bindings
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.site_cta_bindings;
create policy "No authenticated direct access"
  on public.site_cta_bindings
  for all
  to authenticated
  using (false)
  with check (false);

insert into public.site_cta_bindings (slot, campaign_slug)
values
  ('ai_readiness_orientation_primary', null),
  ('ai_readiness_orientation_secondary', null)
on conflict (slot) do nothing;
