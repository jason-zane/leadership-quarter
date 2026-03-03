create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  status text not null default 'draft',
  is_public boolean not null default false,
  version integer not null default 1,
  scoring_config jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint surveys_status_check check (status in ('draft', 'active', 'archived'))
);

create index if not exists idx_surveys_status on public.surveys (status);
create index if not exists idx_surveys_public_active on public.surveys (is_public, status);

alter table public.surveys enable row level security;
drop policy if exists "No anonymous access" on public.surveys;
create policy "No anonymous access"
  on public.surveys
  for all
  to anon
  using (false)
  with check (false);
drop policy if exists "No authenticated direct access" on public.surveys;
create policy "No authenticated direct access"
  on public.surveys
  for all
  to authenticated
  using (false)
  with check (false);

create table if not exists public.survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys (id) on delete cascade,
  question_key text not null,
  text text not null,
  dimension text not null,
  is_reverse_coded boolean not null default false,
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint survey_questions_unique unique (survey_id, question_key)
);

create index if not exists idx_survey_questions_survey_sort
  on public.survey_questions (survey_id, sort_order);
create index if not exists idx_survey_questions_survey_active
  on public.survey_questions (survey_id, is_active);

alter table public.survey_questions enable row level security;
drop policy if exists "No anonymous access" on public.survey_questions;
create policy "No anonymous access"
  on public.survey_questions
  for all
  to anon
  using (false)
  with check (false);
drop policy if exists "No authenticated direct access" on public.survey_questions;
create policy "No authenticated direct access"
  on public.survey_questions
  for all
  to authenticated
  using (false)
  with check (false);

create table if not exists public.survey_cohorts (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys (id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint survey_cohorts_status_check check (status in ('draft', 'active', 'closed'))
);

create index if not exists idx_survey_cohorts_survey_id on public.survey_cohorts (survey_id);
create index if not exists idx_survey_cohorts_status on public.survey_cohorts (status);

alter table public.survey_cohorts enable row level security;
drop policy if exists "No anonymous access" on public.survey_cohorts;
create policy "No anonymous access"
  on public.survey_cohorts
  for all
  to anon
  using (false)
  with check (false);
drop policy if exists "No authenticated direct access" on public.survey_cohorts;
create policy "No authenticated direct access"
  on public.survey_cohorts
  for all
  to authenticated
  using (false)
  with check (false);

create table if not exists public.survey_invitations (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys (id) on delete cascade,
  cohort_id uuid references public.survey_cohorts (id) on delete set null,
  token uuid not null unique default gen_random_uuid(),
  contact_id uuid references public.contacts (id) on delete set null,
  email text not null,
  first_name text,
  last_name text,
  organisation text,
  role text,
  status text not null default 'pending',
  expires_at timestamptz,
  sent_at timestamptz,
  opened_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  submission_id uuid,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint survey_invitations_status_check check (
    status in ('pending', 'sent', 'opened', 'started', 'completed', 'expired')
  )
);

create index if not exists idx_survey_invitations_survey_id on public.survey_invitations (survey_id);
create index if not exists idx_survey_invitations_cohort_id on public.survey_invitations (cohort_id);
create index if not exists idx_survey_invitations_email on public.survey_invitations (lower(email));
create index if not exists idx_survey_invitations_status on public.survey_invitations (status);
create index if not exists idx_survey_invitations_token on public.survey_invitations (token);

alter table public.survey_invitations enable row level security;
drop policy if exists "No anonymous access" on public.survey_invitations;
create policy "No anonymous access"
  on public.survey_invitations
  for all
  to anon
  using (false)
  with check (false);
drop policy if exists "No authenticated direct access" on public.survey_invitations;
create policy "No authenticated direct access"
  on public.survey_invitations
  for all
  to authenticated
  using (false)
  with check (false);

create table if not exists public.survey_submissions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys (id) on delete restrict,
  invitation_id uuid references public.survey_invitations (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  first_name text,
  last_name text,
  email text,
  organisation text,
  role text,
  consent boolean,
  responses jsonb not null default '{}'::jsonb,
  normalized_responses jsonb not null default '{}'::jsonb,
  scores jsonb not null default '{}'::jsonb,
  bands jsonb not null default '{}'::jsonb,
  classification jsonb not null default '{}'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_survey_submissions_invitation_unique
  on public.survey_submissions (invitation_id)
  where invitation_id is not null;
create index if not exists idx_survey_submissions_survey_id on public.survey_submissions (survey_id);
create index if not exists idx_survey_submissions_created_at on public.survey_submissions (created_at desc);
create index if not exists idx_survey_submissions_contact_id on public.survey_submissions (contact_id);

alter table public.survey_submissions enable row level security;
drop policy if exists "No anonymous access" on public.survey_submissions;
create policy "No anonymous access"
  on public.survey_submissions
  for all
  to anon
  using (false)
  with check (false);
drop policy if exists "No authenticated direct access" on public.survey_submissions;
create policy "No authenticated direct access"
  on public.survey_submissions
  for all
  to authenticated
  using (false)
  with check (false);

alter table public.survey_submissions
  add column if not exists invitation_id uuid references public.survey_invitations (id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'survey_invitations_submission_fk'
  ) then
    alter table public.survey_invitations
      add constraint survey_invitations_submission_fk
      foreign key (submission_id) references public.survey_submissions (id) on delete set null;
  end if;
end $$;

insert into public.surveys (
  key,
  name,
  description,
  status,
  is_public,
  version,
  scoring_config
)
values (
  'ai_readiness_orientation_v1',
  'AI Readiness Orientation Survey',
  'A short assessment to profile AI readiness across openness, risk posture, and capability.',
  'active',
  true,
  1,
  jsonb_build_object(
    'dimensions',
    jsonb_build_array(
      jsonb_build_object(
        'key', 'openness',
        'label', 'Openness to AI',
        'question_keys', jsonb_build_array('q1', 'q2', 'q3', 'q4', 'q5', 'q6'),
        'thresholds', jsonb_build_object('high', 4, 'mid', 3),
        'bands', jsonb_build_object('high', 'Early Adopter', 'mid', 'Conditional Adopter', 'low', 'Resistant / Hesitant')
      ),
      jsonb_build_object(
        'key', 'riskPosture',
        'label', 'Risk Posture',
        'question_keys', jsonb_build_array('q7', 'q8', 'q9', 'q10', 'q11', 'q12'),
        'thresholds', jsonb_build_object('high', 4, 'mid', 3),
        'bands', jsonb_build_object('high', 'Calibrated & Risk-Aware', 'mid', 'Moderate Awareness', 'low', 'Blind Trust or Low Risk Sensitivity')
      ),
      jsonb_build_object(
        'key', 'capability',
        'label', 'Capability',
        'question_keys', jsonb_build_array('q13', 'q14', 'q15', 'q16', 'q17', 'q18'),
        'thresholds', jsonb_build_object('high', 4, 'mid', 3),
        'bands', jsonb_build_object('high', 'Confident & Skilled', 'mid', 'Developing', 'low', 'Low Confidence')
      )
    ),
    'classifications',
    jsonb_build_array(
      jsonb_build_object(
        'key', 'ai_ready_operator',
        'label', 'AI-Ready Operator',
        'conditions', jsonb_build_array(
          jsonb_build_object('dimension', 'openness', 'operator', '>=', 'value', 4),
          jsonb_build_object('dimension', 'riskPosture', 'operator', '>=', 'value', 4),
          jsonb_build_object('dimension', 'capability', 'operator', '>=', 'value', 4)
        ),
        'recommendations', jsonb_build_array(
          'Involve this person in AI pilot initiatives and peer enablement.',
          'Give them ownership of high-value workflows where quality and speed both matter.',
          'Use them as a benchmark for practical, responsible AI adoption behavior.'
        )
      ),
      jsonb_build_object(
        'key', 'naive_enthusiast',
        'label', 'Naive Enthusiast',
        'conditions', jsonb_build_array(
          jsonb_build_object('dimension', 'openness', 'operator', '>=', 'value', 4),
          jsonb_build_object('dimension', 'riskPosture', 'operator', '<', 'value', 3)
        ),
        'recommendations', jsonb_build_array(
          'Prioritize governance and output verification habits before scaling usage.',
          'Introduce simple risk-check routines for privacy, ethics, and factual reliability.',
          'Pair experimentation with quality controls to reduce avoidable errors.'
        )
      ),
      jsonb_build_object(
        'key', 'cautious_traditionalist',
        'label', 'Cautious Traditionalist',
        'conditions', jsonb_build_array(
          jsonb_build_object('dimension', 'riskPosture', 'operator', '>=', 'value', 4),
          jsonb_build_object('dimension', 'openness', 'operator', '<', 'value', 3)
        ),
        'recommendations', jsonb_build_array(
          'Build confidence through low-risk, role-relevant AI experiments.',
          'Set short practice cycles focused on value discovery, not tool complexity.',
          'Use examples of safe, high-quality AI use to reduce adoption friction.'
        )
      ),
      jsonb_build_object(
        'key', 'eager_but_underdeveloped',
        'label', 'Eager but Underdeveloped',
        'conditions', jsonb_build_array(
          jsonb_build_object('dimension', 'openness', 'operator', '>=', 'value', 4),
          jsonb_build_object('dimension', 'capability', 'operator', '<', 'value', 3)
        ),
        'recommendations', jsonb_build_array(
          'Focus on practical skill-building: prompting, validation, and workflow integration.',
          'Use guided templates and coaching to improve outcome quality quickly.',
          'Reinforce when to escalate to human judgement in high-stakes contexts.'
        )
      ),
      jsonb_build_object(
        'key', 'ai_resistant',
        'label', 'AI Resistant',
        'conditions', jsonb_build_array(
          jsonb_build_object('dimension', 'openness', 'operator', '<', 'value', 3),
          jsonb_build_object('dimension', 'capability', 'operator', '<', 'value', 3)
        ),
        'recommendations', jsonb_build_array(
          'Start with mindset and relevance: show direct role-level benefits.',
          'Use small wins to build confidence before introducing advanced practices.',
          'Combine support, structure, and repeated practice to shift adoption behavior.'
        )
      ),
      jsonb_build_object(
        'key', 'developing_operator',
        'label', 'Developing Operator',
        'conditions', jsonb_build_array(),
        'recommendations', jsonb_build_array(
          'Continue strengthening all three axes with targeted, role-specific development.',
          'Measure progress over time to move from moderate to high capability.',
          'Use practical feedback loops to improve confidence, judgement, and outcomes.'
        )
      )
    )
  )
)
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  is_public = excluded.is_public,
  version = excluded.version,
  scoring_config = excluded.scoring_config,
  updated_at = now();

insert into public.survey_questions (
  survey_id,
  question_key,
  text,
  dimension,
  is_reverse_coded,
  sort_order,
  is_active
)
select
  s.id,
  q.question_key,
  q.text,
  q.dimension,
  q.is_reverse_coded,
  q.sort_order,
  true
from public.surveys s
cross join (
  values
    ('q1', 'I actively look for ways AI could improve how I work.', 'openness', false, 10),
    ('q2', 'I am comfortable experimenting with AI tools even when the outcomes are uncertain.', 'openness', false, 20),
    ('q3', 'I adapt my workflow when I discover AI can improve efficiency or quality.', 'openness', false, 30),
    ('q4', 'I prefer to rely on established methods rather than experiment with AI.', 'openness', true, 40),
    ('q5', 'I am willing to learn new AI tools without being formally required to do so.', 'openness', false, 50),
    ('q6', 'I feel energised, not threatened, by the increasing use of AI in my field.', 'openness', false, 60),
    ('q7', 'I carefully verify AI-generated outputs before using them in important work.', 'riskPosture', false, 70),
    ('q8', 'I understand the potential privacy or confidentiality risks when using AI tools.', 'riskPosture', false, 80),
    ('q9', 'I consider ethical implications (bias, misuse, misinformation) when applying AI outputs.', 'riskPosture', false, 90),
    ('q10', 'If an AI system sounds confident, I generally assume it is correct.', 'riskPosture', true, 100),
    ('q11', 'I know when AI use would be inappropriate or risky in my role.', 'riskPosture', false, 110),
    ('q12', 'I feel confident navigating grey areas where AI use is not clearly defined.', 'riskPosture', false, 120),
    ('q13', 'I know how to structure prompts to get useful results from AI tools.', 'capability', false, 130),
    ('q14', 'I can usually detect when AI-generated information is inaccurate or misleading.', 'capability', false, 140),
    ('q15', 'I understand, at a high level, how AI systems generate outputs.', 'capability', false, 150),
    ('q16', 'I sometimes rely on AI results without fully understanding them.', 'capability', true, 160),
    ('q17', 'I know where my AI skills are strong and where I need development.', 'capability', false, 170),
    ('q18', 'I can combine AI outputs with my own expertise to improve final outcomes.', 'capability', false, 180)
) as q(question_key, text, dimension, is_reverse_coded, sort_order)
where s.key = 'ai_readiness_orientation_v1'
on conflict (survey_id, question_key) do update
set
  text = excluded.text,
  dimension = excluded.dimension,
  is_reverse_coded = excluded.is_reverse_coded,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.email_templates (
  key,
  slug,
  name,
  description,
  subject,
  html_body,
  text_body,
  category,
  status,
  channel
)
values
  (
    'survey_invitation',
    'survey-invitation',
    'Survey Invitation',
    'Invitation email for private survey recipients.',
    'You''ve been invited to complete the {{survey_name}}',
    '<p>Hi {{first_name}},</p><p>You have been invited to complete the <strong>{{survey_name}}</strong>.</p><p><a href=\"{{invitation_url}}\">Start your survey</a></p><p>Leadership Quarter</p>',
    'Hi {{first_name}},\n\nYou have been invited to complete the {{survey_name}}.\nStart your survey: {{invitation_url}}\n\nLeadership Quarter',
    'operations',
    'active',
    'email'
  ),
  (
    'survey_completion_confirmation',
    'survey-completion-confirmation',
    'Survey Completion Confirmation',
    'Completion email with report access link and classification summary.',
    'Your {{survey_name}} results are ready',
    '<p>Hi {{first_name}},</p><p>Your {{survey_name}} submission is complete.</p><p><strong>Profile:</strong> {{classification_label}}</p><p><a href=\"{{report_url}}\">Open your report</a></p><p>Leadership Quarter</p>',
    'Hi {{first_name}},\n\nYour {{survey_name}} submission is complete.\nProfile: {{classification_label}}\nOpen your report: {{report_url}}\n\nLeadership Quarter',
    'operations',
    'active',
    'email'
  )
on conflict (key) do update
set
  slug = excluded.slug,
  name = excluded.name,
  description = excluded.description,
  subject = excluded.subject,
  html_body = excluded.html_body,
  text_body = excluded.text_body,
  category = excluded.category,
  status = excluded.status,
  channel = excluded.channel,
  updated_at = now();

insert into public.email_template_usages (usage_key, usage_name, description, route_hint, template_key)
values
  (
    'survey.invitation',
    'Survey - Invitation',
    'Private survey invitation email.',
    '/api/admin/invitations/[id]/send',
    'survey_invitation'
  ),
  (
    'survey.completion_confirmation',
    'Survey - Completion Confirmation',
    'Sent when an invited survey is completed.',
    '/api/surveys/invitation/[token]/submit',
    'survey_completion_confirmation'
  )
on conflict (usage_key) do update
set
  usage_name = excluded.usage_name,
  description = excluded.description,
  route_hint = excluded.route_hint,
  template_key = excluded.template_key,
  updated_at = now();
