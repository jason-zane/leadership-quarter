alter table public.surveys add column if not exists public_url text;

update public.surveys
set public_url = '/framework/lq-ai-readiness/orientation-survey'
where key = 'ai_readiness_orientation_v1';
