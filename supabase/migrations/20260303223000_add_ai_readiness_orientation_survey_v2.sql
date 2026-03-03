insert into public.submission_forms (key, name, status, schema_version)
values ('ai_readiness_orientation_survey_v2', 'AI Readiness Orientation Survey', 'active', 2)
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
  ('ai_readiness_orientation_survey_v2', 'first_name', 'First Name', 'text', true, false, null, 10, true),
  ('ai_readiness_orientation_survey_v2', 'last_name', 'Last Name', 'text', true, false, null, 20, true),
  ('ai_readiness_orientation_survey_v2', 'email', 'Work Email', 'text', true, false, null, 30, true),
  ('ai_readiness_orientation_survey_v2', 'organisation', 'Organisation', 'text', true, false, null, 40, true),
  ('ai_readiness_orientation_survey_v2', 'role', 'Role', 'text', true, false, null, 50, true),
  ('ai_readiness_orientation_survey_v2', 'consent', 'Consent', 'boolean', true, false, null, 60, true),

  ('ai_readiness_orientation_survey_v2', 'q1', 'I actively look for ways AI could improve how I work.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 70, true),
  ('ai_readiness_orientation_survey_v2', 'q2', 'I am comfortable experimenting with AI tools even when the outcomes are uncertain.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 80, true),
  ('ai_readiness_orientation_survey_v2', 'q3', 'I adapt my workflow when I discover AI can improve efficiency or quality.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 90, true),
  ('ai_readiness_orientation_survey_v2', 'q4', 'I prefer to rely on established methods rather than experiment with AI. (reverse-coded)', 'number', true, false, '[1,2,3,4,5]'::jsonb, 100, true),
  ('ai_readiness_orientation_survey_v2', 'q5', 'I am willing to learn new AI tools without being formally required to do so.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 110, true),
  ('ai_readiness_orientation_survey_v2', 'q6', 'I feel energised, not threatened, by the increasing use of AI in my field.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 120, true),

  ('ai_readiness_orientation_survey_v2', 'q7', 'I carefully verify AI-generated outputs before using them in important work.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 130, true),
  ('ai_readiness_orientation_survey_v2', 'q8', 'I understand the potential privacy or confidentiality risks when using AI tools.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 140, true),
  ('ai_readiness_orientation_survey_v2', 'q9', 'I consider ethical implications (bias, misuse, misinformation) when applying AI outputs.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 150, true),
  ('ai_readiness_orientation_survey_v2', 'q10', 'If an AI system sounds confident, I generally assume it is correct. (reverse-coded)', 'number', true, false, '[1,2,3,4,5]'::jsonb, 160, true),
  ('ai_readiness_orientation_survey_v2', 'q11', 'I know when AI use would be inappropriate or risky in my role.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 170, true),
  ('ai_readiness_orientation_survey_v2', 'q12', 'I feel confident navigating grey areas where AI use is not clearly defined.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 180, true),

  ('ai_readiness_orientation_survey_v2', 'q13', 'I know how to structure prompts to get useful results from AI tools.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 190, true),
  ('ai_readiness_orientation_survey_v2', 'q14', 'I can usually detect when AI-generated information is inaccurate or misleading.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 200, true),
  ('ai_readiness_orientation_survey_v2', 'q15', 'I understand, at a high level, how AI systems generate outputs.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 210, true),
  ('ai_readiness_orientation_survey_v2', 'q16', 'I sometimes rely on AI results without fully understanding them. (reverse-coded)', 'number', true, false, '[1,2,3,4,5]'::jsonb, 220, true),
  ('ai_readiness_orientation_survey_v2', 'q17', 'I know where my AI skills are strong and where I need development.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 230, true),
  ('ai_readiness_orientation_survey_v2', 'q18', 'I can combine AI outputs with my own expertise to improve final outcomes.', 'number', true, false, '[1,2,3,4,5]'::jsonb, 240, true)
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
