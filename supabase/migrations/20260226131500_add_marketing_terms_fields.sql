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
  ('retreat_registration_v1', 'marketing_opt_in', 'Marketing Opt In', 'boolean', false, false, null, 110, true),
  ('retreat_registration_v1', 'accepted_terms', 'Accepted Terms', 'boolean', true, false, null, 120, true),
  ('retreat_registration_v1', 'accepted_terms_version', 'Accepted Terms Version', 'text', false, false, null, 130, true),
  ('general_registration_v1', 'marketing_opt_in', 'Marketing Opt In', 'boolean', false, false, null, 100, true),
  ('register_interest', 'marketing_opt_in', 'Marketing Opt In', 'boolean', false, false, null, 50, true)
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
