-- Fix: PL/pgSQL does not short-circuit AND for record field access.
-- The old function used `tg_table_name = 'assessment_submissions' AND new.invitation_id IS NOT NULL`
-- which fails on assessment_invitations because that table has no invitation_id column.
-- Use nested IF instead.

create or replace function public.enforce_campaign_entry_limit()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
declare
  entry_limit integer;
  used_entries integer;
begin
  if new.campaign_id is null then
    return new;
  end if;

  -- Skip submissions that already have an invitation (counted via the invitation row).
  if tg_table_name = 'assessment_submissions' then
    if new.invitation_id is not null then
      return new;
    end if;
  end if;

  perform 1
  from public.campaigns
  where id = new.campaign_id
  for update;

  select public.get_campaign_entry_limit(config)
  into entry_limit
  from public.campaigns
  where id = new.campaign_id;

  if entry_limit is null then
    return new;
  end if;

  select
    coalesce((
      select count(*)
      from public.assessment_invitations
      where campaign_id = new.campaign_id
    ), 0) +
    coalesce((
      select count(*)
      from public.assessment_submissions
      where campaign_id = new.campaign_id
        and invitation_id is null
    ), 0)
  into used_entries;

  if used_entries >= entry_limit then
    raise exception 'campaign_limit_reached'
      using errcode = 'P0001',
            detail = format('Campaign %s has reached its limit of %s entries.', new.campaign_id, entry_limit);
  end if;

  return new;
end
$$;
