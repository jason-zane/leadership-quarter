create or replace function public.get_campaign_entry_limit(config jsonb)
returns integer
language sql
immutable
as $$
  select case
    when jsonb_typeof(config -> 'entry_limit') = 'number'
      and floor((config ->> 'entry_limit')::numeric) >= 1
      then floor((config ->> 'entry_limit')::numeric)::integer
    when jsonb_typeof(config -> 'entry_limit') = 'string'
      and (config ->> 'entry_limit') ~ '^[0-9]+$'
      and (config ->> 'entry_limit')::integer >= 1
      then (config ->> 'entry_limit')::integer
    else null
  end
$$;

create or replace function public.enforce_campaign_entry_limit()
returns trigger
language plpgsql
as $$
declare
  entry_limit integer;
  used_entries integer;
begin
  if new.campaign_id is null then
    return new;
  end if;

  if tg_table_name = 'assessment_submissions' and new.invitation_id is not null then
    return new;
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

drop trigger if exists trg_assessment_invitations_enforce_campaign_entry_limit on public.assessment_invitations;
create trigger trg_assessment_invitations_enforce_campaign_entry_limit
before insert on public.assessment_invitations
for each row
execute function public.enforce_campaign_entry_limit();

drop trigger if exists trg_assessment_submissions_enforce_campaign_entry_limit on public.assessment_submissions;
create trigger trg_assessment_submissions_enforce_campaign_entry_limit
before insert on public.assessment_submissions
for each row
execute function public.enforce_campaign_entry_limit();
