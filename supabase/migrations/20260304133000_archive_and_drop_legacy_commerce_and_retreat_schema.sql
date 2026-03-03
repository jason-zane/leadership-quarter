create table if not exists public.schema_cleanup_log (
  id uuid primary key default gen_random_uuid(),
  object_name text not null,
  object_type text not null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  executed_at timestamptz not null default now(),
  unique (object_name, object_type, action)
);

create table if not exists public.legacy_row_archive (
  id uuid primary key default gen_random_uuid(),
  archive_batch text not null,
  source_table text not null,
  source_pk text,
  payload jsonb not null,
  archived_at timestamptz not null default now()
);

do $$
declare
  batch_id text := to_char(now(), 'YYYYMMDDHH24MISS') || '_legacy_cleanup';
begin
  if to_regclass('public.offerings') is not null then
    insert into public.legacy_row_archive (archive_batch, source_table, source_pk, payload)
    select batch_id, 'offerings', o.id::text, to_jsonb(o)
    from public.offerings o;
  end if;

  if to_regclass('public.offering_variants') is not null then
    insert into public.legacy_row_archive (archive_batch, source_table, source_pk, payload)
    select batch_id, 'offering_variants', ov.id::text, to_jsonb(ov)
    from public.offering_variants ov;
  end if;

  if to_regclass('public.bookings') is not null then
    insert into public.legacy_row_archive (archive_batch, source_table, source_pk, payload)
    select batch_id, 'bookings', b.id::text, to_jsonb(b)
    from public.bookings b;
  end if;

  if to_regclass('public.payments') is not null then
    insert into public.legacy_row_archive (archive_batch, source_table, source_pk, payload)
    select batch_id, 'payments', p.id::text, to_jsonb(p)
    from public.payments p;
  end if;

  if to_regclass('public.contact_identities') is not null then
    insert into public.legacy_row_archive (archive_batch, source_table, source_pk, payload)
    select batch_id, 'contact_identities', ci.id::text, to_jsonb(ci)
    from public.contact_identities ci;
  end if;

  insert into public.legacy_row_archive (archive_batch, source_table, source_pk, payload)
  select
    batch_id,
    'contacts_legacy_columns',
    c.id::text,
    jsonb_build_object(
      'weekly_distance_km', c.weekly_distance_km,
      'long_run_km', c.long_run_km,
      'pace_group', c.pace_group,
      'dietary_requirements', c.dietary_requirements,
      'injury_notes', c.injury_notes,
      'retreat_goals', c.retreat_goals,
      'preferred_retreat_timing', c.preferred_retreat_timing,
      'location_city', c.location_city,
      'phone', c.phone,
      'age_range', c.age_range,
      'gender', c.gender,
      'gender_self_describe', c.gender_self_describe,
      'runner_type', c.runner_type,
      'location_label', c.location_label,
      'retreat_slug', c.retreat_slug,
      'retreat_name', c.retreat_name,
      'budget_range', c.budget_range,
      'retreat_style_preference', c.retreat_style_preference,
      'duration_preference', c.duration_preference,
      'travel_radius', c.travel_radius,
      'accommodation_preference', c.accommodation_preference,
      'community_vs_performance', c.community_vs_performance,
      'preferred_season', c.preferred_season,
      'gender_optional', c.gender_optional,
      'life_stage_optional', c.life_stage_optional,
      'what_would_make_it_great', c.what_would_make_it_great,
      'profile_v2_updated_at', c.profile_v2_updated_at
    )
  from public.contacts c
  where c.weekly_distance_km is not null
     or c.long_run_km is not null
     or c.pace_group is not null
     or c.dietary_requirements is not null
     or c.injury_notes is not null
     or c.retreat_goals is not null
     or c.preferred_retreat_timing is not null
     or c.location_city is not null
     or c.phone is not null
     or c.age_range is not null
     or c.gender is not null
     or c.gender_self_describe is not null
     or c.runner_type is not null
     or c.location_label is not null
     or c.retreat_slug is not null
     or c.retreat_name is not null
     or c.budget_range is not null
     or c.retreat_style_preference is not null
     or c.duration_preference is not null
     or c.travel_radius is not null
     or c.accommodation_preference is not null
     or c.community_vs_performance is not null
     or c.preferred_season is not null
     or c.gender_optional is not null
     or c.life_stage_optional is not null
     or c.what_would_make_it_great is not null
     or c.profile_v2_updated_at is not null;

  insert into public.schema_cleanup_log (object_name, object_type, action, details)
  values
    ('legacy_row_archive', 'table', 'archive_batch_created', jsonb_build_object('batch_id', batch_id))
  on conflict (object_name, object_type, action) do nothing;
end $$;

drop table if exists public.payments;
drop table if exists public.bookings;
drop table if exists public.offering_variants;
drop table if exists public.offerings;
drop table if exists public.contact_identities;

alter table public.contacts
  drop column if exists weekly_distance_km,
  drop column if exists long_run_km,
  drop column if exists pace_group,
  drop column if exists dietary_requirements,
  drop column if exists injury_notes,
  drop column if exists retreat_goals,
  drop column if exists preferred_retreat_timing,
  drop column if exists location_city,
  drop column if exists phone,
  drop column if exists age_range,
  drop column if exists gender,
  drop column if exists gender_self_describe,
  drop column if exists runner_type,
  drop column if exists location_label,
  drop column if exists retreat_slug,
  drop column if exists retreat_name,
  drop column if exists budget_range,
  drop column if exists retreat_style_preference,
  drop column if exists duration_preference,
  drop column if exists travel_radius,
  drop column if exists accommodation_preference,
  drop column if exists community_vs_performance,
  drop column if exists preferred_season,
  drop column if exists gender_optional,
  drop column if exists life_stage_optional,
  drop column if exists what_would_make_it_great,
  drop column if exists profile_v2_updated_at;

delete from public.submission_field_definitions
where form_key in ('retreat_registration_v1', 'general_registration_v1', 'retreat_profile_optional_v1')
   or (
     form_key = 'register_interest'
     and field_key in (
       'weekly_distance_km',
       'long_run_km',
       'pace_group',
       'dietary_requirements',
       'injury_notes',
       'retreat_goals',
       'preferred_retreat_timing',
       'city',
       'phone'
     )
   );

delete from public.submission_forms sf
where sf.key in ('retreat_registration_v1', 'general_registration_v1', 'retreat_profile_optional_v1')
  and not exists (
    select 1
    from public.interest_submissions s
    where s.form_key = sf.key
  );

insert into public.schema_cleanup_log (object_name, object_type, action, details)
values
  ('offerings,offering_variants,bookings,payments,contact_identities', 'table', 'dropped', jsonb_build_object('reason', 'legacy_commerce_flow_removed')),
  ('contacts', 'table_columns', 'legacy_columns_dropped', jsonb_build_object('reason', 'legacy_retreat_profile_fields_removed')),
  ('submission_field_definitions', 'configuration', 'legacy_fields_deleted', jsonb_build_object('reason', 'legacy_retreat_and_register_interest_fields'))
on conflict (object_name, object_type, action) do nothing;
