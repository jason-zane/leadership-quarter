-- Stop granting internal dashboard access to every new auth user.
drop trigger if exists on_auth_user_created_profile on auth.users;
drop function if exists public.handle_new_user_profile();

-- Remove accidental internal staff roles for portal users.
-- Keep explicit admin roles intact.
delete from public.profiles p
where p.role = 'staff'
  and exists (
    select 1
    from public.organisation_memberships m
    where m.user_id = p.user_id
  );
