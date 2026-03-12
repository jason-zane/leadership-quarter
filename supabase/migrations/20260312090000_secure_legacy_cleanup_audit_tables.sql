alter table public.schema_cleanup_log enable row level security;
alter table public.legacy_row_archive enable row level security;

revoke all on table public.schema_cleanup_log from public, anon, authenticated;
revoke all on table public.legacy_row_archive from public, anon, authenticated;

drop policy if exists "No anonymous access" on public.schema_cleanup_log;
create policy "No anonymous access"
  on public.schema_cleanup_log
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.schema_cleanup_log;
create policy "No authenticated direct access"
  on public.schema_cleanup_log
  for all
  to authenticated
  using (false)
  with check (false);

drop policy if exists "No anonymous access" on public.legacy_row_archive;
create policy "No anonymous access"
  on public.legacy_row_archive
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.legacy_row_archive;
create policy "No authenticated direct access"
  on public.legacy_row_archive
  for all
  to authenticated
  using (false)
  with check (false);
