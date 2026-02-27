-- Ensure profile rows exist for all auth users and keep auto-create trigger in place.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, role, created_at, updated_at)
  values (new.id, 'staff', now(), now())
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- Backfill missing profile rows for existing auth users.
insert into public.profiles (user_id, role, created_at, updated_at)
select u.id, 'staff', now(), now()
from auth.users u
left join public.profiles p on p.user_id = u.id
where p.user_id is null;

-- Promote initial admin account(s).
update public.profiles p
set role = 'admin',
    updated_at = now()
from auth.users u
where u.id = p.user_id
  and lower(u.email) in ('jason@milesbetween.com');
