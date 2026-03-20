with ranked as (
  select
    id,
    email_normalized,
    contact_id,
    created_at,
    row_number() over (
      partition by email_normalized
      order by
        case when contact_id is not null then 0 else 1 end,
        created_at asc,
        id asc
    ) as rank_order
  from public.assessment_participants
  where email is not null
),
duplicates as (
  select
    loser.id as loser_id,
    winner.id as winner_id
  from ranked loser
  join ranked winner
    on winner.email_normalized = loser.email_normalized
   and winner.rank_order = 1
  where loser.rank_order > 1
)
update public.assessment_invitations ai
set participant_id = d.winner_id
from duplicates d
where ai.participant_id = d.loser_id;

with ranked as (
  select
    id,
    email_normalized,
    contact_id,
    created_at,
    row_number() over (
      partition by email_normalized
      order by
        case when contact_id is not null then 0 else 1 end,
        created_at asc,
        id asc
    ) as rank_order
  from public.assessment_participants
  where email is not null
),
duplicates as (
  select
    loser.id as loser_id,
    winner.id as winner_id
  from ranked loser
  join ranked winner
    on winner.email_normalized = loser.email_normalized
   and winner.rank_order = 1
  where loser.rank_order > 1
)
update public.assessment_submissions s
set participant_id = d.winner_id
from duplicates d
where s.participant_id = d.loser_id;

with ranked as (
  select
    id,
    email_normalized,
    row_number() over (
      partition by email_normalized
      order by
        case when contact_id is not null then 0 else 1 end,
        created_at asc,
        id asc
    ) as rank_order
  from public.assessment_participants
  where email is not null
)
delete from public.assessment_participants ap
using ranked r
where ap.id = r.id
  and r.rank_order > 1;

create unique index if not exists idx_assessment_participants_email_unique
  on public.assessment_participants (email_normalized)
  where email is not null;
