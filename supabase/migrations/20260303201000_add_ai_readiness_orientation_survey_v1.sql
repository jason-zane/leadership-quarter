insert into public.submission_forms (key, name, status, schema_version)
values ('ai_readiness_orientation_survey_v1', 'AI Readiness Orientation Survey', 'active', 1)
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
  ('ai_readiness_orientation_survey_v1', 'first_name', 'First Name', 'text', true, false, null, 10, true),
  ('ai_readiness_orientation_survey_v1', 'last_name', 'Last Name', 'text', true, false, null, 20, true),
  ('ai_readiness_orientation_survey_v1', 'email', 'Work Email', 'text', true, false, null, 30, true),
  ('ai_readiness_orientation_survey_v1', 'organisation', 'Organisation', 'text', true, false, null, 40, true),
  ('ai_readiness_orientation_survey_v1', 'role', 'Role', 'text', true, false, null, 50, true),
  ('ai_readiness_orientation_survey_v1', 'consent', 'Consent', 'boolean', true, false, null, 60, true),

  ('ai_readiness_orientation_survey_v1', 'q1', 'I feel excited to try out new AI tools that could help me in my work.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 70, true),
  ('ai_readiness_orientation_survey_v1', 'q2', 'I am comfortable changing my usual workflow when I find an AI tool that could make tasks easier.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 80, true),
  ('ai_readiness_orientation_survey_v1', 'q3', 'I enjoy learning about AI technologies and exploring what they can do.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 90, true),
  ('ai_readiness_orientation_survey_v1', 'q4', 'I prefer to wait until AI tools are proven and widely adopted before using them. (reverse-coded)', 'number', true, false, '[1,2,3,4,5]'::jsonb, 100, true),

  ('ai_readiness_orientation_survey_v1', 'q5', 'I worry that using AI tools might lead to mistakes or misuse in my work.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 110, true),
  ('ai_readiness_orientation_survey_v1', 'q6', 'I am concerned that AI systems could expose sensitive information or violate privacy.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 120, true),
  ('ai_readiness_orientation_survey_v1', 'q7', 'I trust AI-generated outputs as long as they come from reputable sources. (reverse-coded)', 'number', true, false, '[1,2,3,4,5]'::jsonb, 130, true),
  ('ai_readiness_orientation_survey_v1', 'q8', 'I understand the ethical implications and potential biases of using AI tools.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 140, true),

  ('ai_readiness_orientation_survey_v1', 'q9', 'I feel confident in my ability to get useful results from AI tools.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 150, true),
  ('ai_readiness_orientation_survey_v1', 'q10', 'I can usually tell when AI-generated information is inaccurate or misleading.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 160, true),
  ('ai_readiness_orientation_survey_v1', 'q11', 'I sometimes rely too heavily on AI tools without understanding how they work. (reverse-coded)', 'number', true, false, '[1,2,3,4,5]'::jsonb, 170, true),
  ('ai_readiness_orientation_survey_v1', 'q12', 'I know when to seek human input instead of relying solely on AI.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 180, true)
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
