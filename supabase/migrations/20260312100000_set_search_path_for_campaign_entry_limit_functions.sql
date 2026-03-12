alter function public.get_campaign_entry_limit(jsonb)
  set search_path = pg_catalog, public, pg_temp;

alter function public.enforce_campaign_entry_limit()
  set search_path = pg_catalog, public, pg_temp;
