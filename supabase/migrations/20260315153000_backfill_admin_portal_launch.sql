update public.profiles
set portal_admin_access = true,
    updated_at = now()
where role = 'admin'
  and portal_admin_access = false;
