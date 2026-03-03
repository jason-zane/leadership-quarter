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

create index if not exists idx_legacy_row_archive_source_table
  on public.legacy_row_archive (source_table);
create index if not exists idx_legacy_row_archive_batch
  on public.legacy_row_archive (archive_batch);
create index if not exists idx_legacy_row_archive_archived_at
  on public.legacy_row_archive (archived_at desc);

do $$
begin
  if to_regclass('public.offerings') is not null then
    comment on table public.offerings is 'DEPRECATED: legacy commerce flow, scheduled for removal.';
  end if;
  if to_regclass('public.offering_variants') is not null then
    comment on table public.offering_variants is 'DEPRECATED: legacy commerce flow, scheduled for removal.';
  end if;
  if to_regclass('public.bookings') is not null then
    comment on table public.bookings is 'DEPRECATED: legacy commerce flow, scheduled for removal.';
  end if;
  if to_regclass('public.payments') is not null then
    comment on table public.payments is 'DEPRECATED: legacy commerce flow, scheduled for removal.';
  end if;
  if to_regclass('public.contact_identities') is not null then
    comment on table public.contact_identities is 'DEPRECATED: legacy commerce flow, scheduled for removal.';
  end if;
end $$;

insert into public.schema_cleanup_log (object_name, object_type, action, details)
values
  ('offerings', 'table', 'deprecated', jsonb_build_object('reason', 'legacy_commerce_flow')),
  ('offering_variants', 'table', 'deprecated', jsonb_build_object('reason', 'legacy_commerce_flow')),
  ('bookings', 'table', 'deprecated', jsonb_build_object('reason', 'legacy_commerce_flow')),
  ('payments', 'table', 'deprecated', jsonb_build_object('reason', 'legacy_commerce_flow')),
  ('contact_identities', 'table', 'deprecated', jsonb_build_object('reason', 'legacy_commerce_flow'))
on conflict (object_name, object_type, action) do nothing;

update public.submission_forms
set
  status = 'inactive',
  updated_at = now()
where key in ('retreat_registration_v1', 'general_registration_v1', 'retreat_profile_optional_v1');

update public.submission_field_definitions
set
  is_active = false,
  updated_at = now()
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

insert into public.schema_cleanup_log (object_name, object_type, action, details)
values
  (
    'retreat_registration_v1,general_registration_v1,retreat_profile_optional_v1',
    'submission_forms',
    'inactive',
    jsonb_build_object('reason', 'legacy_retreat_flows')
  ),
  (
    'submission_field_definitions',
    'configuration',
    'legacy_fields_deactivated',
    jsonb_build_object('reason', 'legacy_retreat_and_register_interest_fields')
  )
on conflict (object_name, object_type, action) do nothing;
