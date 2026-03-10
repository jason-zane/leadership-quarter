alter table public.assessment_invitations
  add column if not exists demographics jsonb;
