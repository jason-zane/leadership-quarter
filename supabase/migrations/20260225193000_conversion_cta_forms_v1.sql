insert into public.submission_forms (key, name, status, schema_version)
values
  ('retreat_registration_v1', 'Retreat Registration (v1)', 'active', 1),
  ('general_registration_v1', 'General Registration (v1)', 'active', 1),
  ('retreat_profile_optional_v1', 'Retreat Profile Optional (v1)', 'active', 1)
on conflict (key) do update
set
  name = excluded.name,
  status = excluded.status,
  schema_version = excluded.schema_version,
  updated_at = now();

insert into public.submission_field_definitions (
  form_key,
  field_key,
  label,
  field_type,
  required,
  sensitive,
  options,
  sort_order,
  is_active
)
values
  ('retreat_registration_v1', 'first_name', 'First Name', 'text', true, false, null, 10, true),
  ('retreat_registration_v1', 'last_name', 'Last Name', 'text', true, false, null, 20, true),
  ('retreat_registration_v1', 'email', 'Email', 'text', true, false, null, 30, true),
  ('retreat_registration_v1', 'age_range', 'Age Range', 'select', true, false, '["18-24","25-34","35-44","45-54","55-64","65+"]'::jsonb, 40, true),
  ('retreat_registration_v1', 'gender', 'Gender', 'select', true, false, '["Woman","Man","Non-binary","Self-describe"]'::jsonb, 50, true),
  ('retreat_registration_v1', 'gender_self_describe', 'Gender Self Describe', 'text', false, true, null, 60, true),
  ('retreat_registration_v1', 'runner_type', 'Runner Type', 'select', true, false, '["New or returning runner","Consistent recreational runner","Social/community runner","Endurance-focused runner"]'::jsonb, 70, true),
  ('retreat_registration_v1', 'location_label', 'Location', 'text', true, false, null, 80, true),
  ('retreat_registration_v1', 'retreat_slug', 'Retreat Slug', 'text', true, false, null, 90, true),
  ('retreat_registration_v1', 'source', 'Source', 'text', false, false, null, 100, true),

  ('general_registration_v1', 'first_name', 'First Name', 'text', true, false, null, 10, true),
  ('general_registration_v1', 'last_name', 'Last Name', 'text', true, false, null, 20, true),
  ('general_registration_v1', 'email', 'Email', 'text', true, false, null, 30, true),
  ('general_registration_v1', 'age_range', 'Age Range', 'select', true, false, '["18-24","25-34","35-44","45-54","55-64","65+"]'::jsonb, 40, true),
  ('general_registration_v1', 'gender', 'Gender', 'select', true, false, '["Woman","Man","Non-binary","Self-describe"]'::jsonb, 50, true),
  ('general_registration_v1', 'gender_self_describe', 'Gender Self Describe', 'text', false, true, null, 60, true),
  ('general_registration_v1', 'runner_type', 'Runner Type', 'select', true, false, '["New or returning runner","Consistent recreational runner","Social/community runner","Endurance-focused runner"]'::jsonb, 70, true),
  ('general_registration_v1', 'location_label', 'Location', 'text', true, false, null, 80, true),
  ('general_registration_v1', 'source', 'Source', 'text', false, false, null, 90, true),

  ('retreat_profile_optional_v1', 'budget_range', 'Budget Range', 'select', false, false, '["2k_or_less","2k_4k","4k_6k","6k_8k","8k_or_more"]'::jsonb, 5, true),
  ('retreat_profile_optional_v1', 'retreat_style_preference', 'Retreat Style Preference', 'select', false, false, null, 10, true),
  ('retreat_profile_optional_v1', 'duration_preference', 'Duration Preference', 'select', false, false, null, 20, true),
  ('retreat_profile_optional_v1', 'travel_radius', 'Travel Radius', 'select', false, false, null, 30, true),
  ('retreat_profile_optional_v1', 'accommodation_preference', 'Accommodation Preference', 'select', false, false, null, 40, true),
  ('retreat_profile_optional_v1', 'community_vs_performance', 'Community vs Performance', 'select', false, false, null, 50, true),
  ('retreat_profile_optional_v1', 'preferred_season', 'Preferred Season', 'select', false, false, null, 60, true),
  ('retreat_profile_optional_v1', 'gender_optional', 'Gender (optional)', 'select', false, true, null, 70, true),
  ('retreat_profile_optional_v1', 'life_stage_optional', 'Life Stage (optional)', 'select', false, true, null, 80, true),
  ('retreat_profile_optional_v1', 'what_would_make_it_great', 'What Would Make It Great', 'textarea', false, false, null, 90, true)
on conflict (form_key, field_key) do update
set
  label = excluded.label,
  field_type = excluded.field_type,
  required = excluded.required,
  sensitive = excluded.sensitive,
  options = excluded.options,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

update public.submission_field_definitions
set
  is_active = false,
  updated_at = now()
where form_key in ('retreat_registration_v1', 'general_registration_v1')
  and field_key in ('running_volume_range', 'budget_range');
