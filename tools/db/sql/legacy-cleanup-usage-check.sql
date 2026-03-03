-- Legacy cleanup usage checks
-- Run in Supabase SQL editor (staging first, then production)

-- 1) Row counts for legacy commerce tables
select 'offerings' as table_name, count(*) as row_count from public.offerings
union all
select 'offering_variants', count(*) from public.offering_variants
union all
select 'bookings', count(*) from public.bookings
union all
select 'payments', count(*) from public.payments
union all
select 'contact_identities', count(*) from public.contact_identities
order by table_name;

-- 2) Recent writes in the last 7 days (where timestamp columns are available)
select 'offerings' as table_name, count(*) as writes_last_7d
from public.offerings where coalesce(updated_at, created_at) >= now() - interval '7 days'
union all
select 'offering_variants', count(*) from public.offering_variants where coalesce(updated_at, created_at) >= now() - interval '7 days'
union all
select 'bookings', count(*) from public.bookings where coalesce(updated_at, created_at) >= now() - interval '7 days'
union all
select 'payments', count(*) from public.payments where coalesce(updated_at, created_at) >= now() - interval '7 days'
union all
select 'contact_identities', count(*) from public.contact_identities where created_at >= now() - interval '7 days'
order by table_name;

-- 3) Legacy form-key usage in interest submissions (total + last 7 days)
select
  form_key,
  count(*) as total_rows,
  count(*) filter (where created_at >= now() - interval '7 days') as rows_last_7d
from public.interest_submissions
where form_key in (
  'register_interest',
  'retreat_registration_v1',
  'general_registration_v1',
  'retreat_profile_optional_v1'
)
group by form_key
order by form_key;

-- 4) Non-null counts on legacy contacts columns (retreat/dietary/profile)
select
  count(*) filter (where weekly_distance_km is not null) as weekly_distance_km_non_null,
  count(*) filter (where long_run_km is not null) as long_run_km_non_null,
  count(*) filter (where pace_group is not null) as pace_group_non_null,
  count(*) filter (where dietary_requirements is not null) as dietary_requirements_non_null,
  count(*) filter (where injury_notes is not null) as injury_notes_non_null,
  count(*) filter (where retreat_goals is not null) as retreat_goals_non_null,
  count(*) filter (where preferred_retreat_timing is not null) as preferred_retreat_timing_non_null,
  count(*) filter (where location_city is not null) as location_city_non_null,
  count(*) filter (where phone is not null) as phone_non_null,
  count(*) filter (where age_range is not null) as age_range_non_null,
  count(*) filter (where gender is not null) as gender_non_null,
  count(*) filter (where gender_self_describe is not null) as gender_self_describe_non_null,
  count(*) filter (where runner_type is not null) as runner_type_non_null,
  count(*) filter (where location_label is not null) as location_label_non_null,
  count(*) filter (where retreat_slug is not null) as retreat_slug_non_null,
  count(*) filter (where retreat_name is not null) as retreat_name_non_null,
  count(*) filter (where budget_range is not null) as budget_range_non_null,
  count(*) filter (where retreat_style_preference is not null) as retreat_style_preference_non_null,
  count(*) filter (where duration_preference is not null) as duration_preference_non_null,
  count(*) filter (where travel_radius is not null) as travel_radius_non_null,
  count(*) filter (where accommodation_preference is not null) as accommodation_preference_non_null,
  count(*) filter (where community_vs_performance is not null) as community_vs_performance_non_null,
  count(*) filter (where preferred_season is not null) as preferred_season_non_null,
  count(*) filter (where gender_optional is not null) as gender_optional_non_null,
  count(*) filter (where life_stage_optional is not null) as life_stage_optional_non_null,
  count(*) filter (where what_would_make_it_great is not null) as what_would_make_it_great_non_null,
  count(*) filter (where profile_v2_updated_at is not null) as profile_v2_updated_at_non_null
from public.contacts;

-- 5) Pending field reviews on legacy keys
select
  field_key,
  decision,
  count(*) as row_count
from public.submission_field_reviews
where field_key in (
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
group by field_key, decision
order by field_key, decision;
