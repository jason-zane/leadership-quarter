-- Legacy cleanup dependency checks
-- Run in Supabase SQL editor (staging first, then production)

-- 1) Any foreign keys referencing legacy commerce tables?
select
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema as ref_schema,
  ccu.table_name as ref_table,
  ccu.column_name as ref_column,
  tc.constraint_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
  and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
  and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and ccu.table_schema = 'public'
  and ccu.table_name in ('offerings', 'offering_variants', 'bookings', 'payments', 'contact_identities')
order by tc.table_schema, tc.table_name, tc.constraint_name;

-- 2) Functions/procedures referencing legacy table names
select
  n.nspname as schema_name,
  p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname not in ('pg_catalog', 'information_schema')
  and (
    pg_get_functiondef(p.oid) ilike '%offerings%'
    or pg_get_functiondef(p.oid) ilike '%offering_variants%'
    or pg_get_functiondef(p.oid) ilike '%bookings%'
    or pg_get_functiondef(p.oid) ilike '%payments%'
    or pg_get_functiondef(p.oid) ilike '%contact_identities%'
    or pg_get_functiondef(p.oid) ilike '%weekly_distance_km%'
    or pg_get_functiondef(p.oid) ilike '%dietary_requirements%'
  )
order by schema_name, function_name;

-- 3) Views/materialized views referencing legacy objects
select
  schemaname,
  viewname,
  definition
from pg_views
where schemaname not in ('pg_catalog', 'information_schema')
  and (
    definition ilike '%offerings%'
    or definition ilike '%offering_variants%'
    or definition ilike '%bookings%'
    or definition ilike '%payments%'
    or definition ilike '%contact_identities%'
    or definition ilike '%weekly_distance_km%'
    or definition ilike '%dietary_requirements%'
  )
order by schemaname, viewname;

-- 4) Trigger functions mentioning legacy objects
select
  n.nspname as schema_name,
  p.proname as trigger_function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where exists (
  select 1
  from pg_trigger t
  where t.tgfoid = p.oid
)
and n.nspname not in ('pg_catalog', 'information_schema')
and (
  pg_get_functiondef(p.oid) ilike '%offerings%'
  or pg_get_functiondef(p.oid) ilike '%offering_variants%'
  or pg_get_functiondef(p.oid) ilike '%bookings%'
  or pg_get_functiondef(p.oid) ilike '%payments%'
  or pg_get_functiondef(p.oid) ilike '%contact_identities%'
  or pg_get_functiondef(p.oid) ilike '%weekly_distance_km%'
  or pg_get_functiondef(p.oid) ilike '%dietary_requirements%'
)
order by schema_name, trigger_function_name;
