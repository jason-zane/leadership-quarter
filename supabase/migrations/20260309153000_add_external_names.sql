alter table public.assessments
  add column if not exists external_name text;

update public.assessments
set external_name = name
where external_name is null or btrim(external_name) = '';

alter table public.assessments
  alter column external_name set not null;

alter table public.campaigns
  add column if not exists external_name text;

update public.campaigns
set external_name = name
where external_name is null or btrim(external_name) = '';

alter table public.campaigns
  alter column external_name set not null;
