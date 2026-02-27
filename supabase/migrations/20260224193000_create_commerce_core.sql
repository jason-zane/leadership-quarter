create table if not exists public.offerings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  status text not null default 'draft',
  base_price_cents integer not null check (base_price_cents >= 0),
  currency text not null default 'USD',
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer check (capacity is null or capacity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offerings_status_check check (status in ('draft', 'active', 'archived'))
);

create index if not exists idx_offerings_status on public.offerings (status);
create index if not exists idx_offerings_starts_at on public.offerings (starts_at);

alter table public.offerings enable row level security;

drop policy if exists "No anonymous access" on public.offerings;
create policy "No anonymous access"
  on public.offerings
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.offerings;
create policy "No authenticated direct access"
  on public.offerings
  for all
  to authenticated
  using (false)
  with check (false);

create table if not exists public.offering_variants (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.offerings (id) on delete cascade,
  name text not null,
  status text not null default 'active',
  price_cents integer not null check (price_cents >= 0),
  capacity integer check (capacity is null or capacity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offering_variants_status_check check (status in ('active', 'archived'))
);

create unique index if not exists idx_offering_variants_offering_name_unique
  on public.offering_variants (offering_id, lower(name));
create index if not exists idx_offering_variants_offering_id
  on public.offering_variants (offering_id);
create index if not exists idx_offering_variants_status
  on public.offering_variants (status);

alter table public.offering_variants enable row level security;

drop policy if exists "No anonymous access" on public.offering_variants;
create policy "No anonymous access"
  on public.offering_variants
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.offering_variants;
create policy "No authenticated direct access"
  on public.offering_variants
  for all
  to authenticated
  using (false)
  with check (false);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete restrict,
  offering_id uuid not null references public.offerings (id) on delete restrict,
  variant_id uuid references public.offering_variants (id) on delete set null,
  status text not null default 'initiated',
  total_cents integer not null check (total_cents >= 0),
  currency text not null default 'USD',
  source text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_status_check check (
    status in ('initiated', 'reserved', 'confirmed', 'cancelled', 'refunded')
  )
);

create index if not exists idx_bookings_contact_id on public.bookings (contact_id);
create index if not exists idx_bookings_offering_id on public.bookings (offering_id);
create index if not exists idx_bookings_variant_id on public.bookings (variant_id);
create index if not exists idx_bookings_status on public.bookings (status);
create index if not exists idx_bookings_created_at on public.bookings (created_at desc);

alter table public.bookings enable row level security;

drop policy if exists "No anonymous access" on public.bookings;
create policy "No anonymous access"
  on public.bookings
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.bookings;
create policy "No authenticated direct access"
  on public.bookings
  for all
  to authenticated
  using (false)
  with check (false);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  provider text not null,
  provider_payment_id text,
  provider_checkout_session_id text,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD',
  status text not null default 'requires_payment_method',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_status_check check (
    status in (
      'requires_payment_method',
      'processing',
      'succeeded',
      'failed',
      'refunded'
    )
  )
);

create index if not exists idx_payments_booking_id on public.payments (booking_id);
create index if not exists idx_payments_provider on public.payments (provider);
create index if not exists idx_payments_status on public.payments (status);
create unique index if not exists idx_payments_provider_payment_id_unique
  on public.payments (provider, provider_payment_id)
  where provider_payment_id is not null;
create unique index if not exists idx_payments_provider_checkout_session_unique
  on public.payments (provider, provider_checkout_session_id)
  where provider_checkout_session_id is not null;

alter table public.payments enable row level security;

drop policy if exists "No anonymous access" on public.payments;
create policy "No anonymous access"
  on public.payments
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.payments;
create policy "No authenticated direct access"
  on public.payments
  for all
  to authenticated
  using (false)
  with check (false);

create table if not exists public.contact_identities (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  provider text not null,
  provider_customer_id text not null,
  provider_email text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_contact_identities_provider_customer_unique
  on public.contact_identities (provider, provider_customer_id);
create index if not exists idx_contact_identities_contact_id
  on public.contact_identities (contact_id);

alter table public.contact_identities enable row level security;

drop policy if exists "No anonymous access" on public.contact_identities;
create policy "No anonymous access"
  on public.contact_identities
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "No authenticated direct access" on public.contact_identities;
create policy "No authenticated direct access"
  on public.contact_identities
  for all
  to authenticated
  using (false)
  with check (false);
