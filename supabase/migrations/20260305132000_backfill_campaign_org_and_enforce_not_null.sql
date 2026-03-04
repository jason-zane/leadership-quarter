insert into public.organisations (name, slug, status)
values ('Leadership Quarter Internal', 'internal-lq', 'active')
on conflict (slug) do update
set
  name = excluded.name,
  status = excluded.status,
  updated_at = now();

update public.campaigns c
set
  organisation_id = o.id,
  updated_at = now()
from public.organisations o
where c.organisation_id is null
  and o.slug = 'internal-lq';

alter table public.campaigns
  alter column organisation_id set not null;
