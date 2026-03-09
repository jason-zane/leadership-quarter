-- Add external_name to assessment_traits and assessment_dimensions
-- Add description to campaigns
-- All columns are nullable (opt-in override; report layer falls back to name when null)

alter table public.assessment_traits
  add column if not exists external_name text;

alter table public.assessment_dimensions
  add column if not exists external_name text;

alter table public.campaigns
  add column if not exists description text;
