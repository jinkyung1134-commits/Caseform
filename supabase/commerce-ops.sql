-- VELTIER commerce operations extension
-- Run this after supabase/schema.sql when adding order management, inventory, and notification queues.

alter table public.orders
  add column if not exists tracking_number text default '',
  add column if not exists tracking_url text default '',
  add column if not exists admin_note text default '',
  add column if not exists paid_at timestamptz,
  add column if not exists shipped_at timestamptz;

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_index integer not null,
  device text not null,
  sku text default '',
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_index, device)
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  recipient_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists public.user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default '기본 배송지',
  recipient_name text not null,
  phone text not null,
  postal_code text default '',
  address1 text not null,
  address2 text default '',
  delivery_note text default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_variants enable row level security;
alter table public.notification_events enable row level security;
alter table public.user_addresses enable row level security;

drop trigger if exists touch_product_variants_updated_at on public.product_variants;
create trigger touch_product_variants_updated_at
before update on public.product_variants
for each row execute function public.touch_updated_at();

drop trigger if exists touch_user_addresses_updated_at on public.user_addresses;
create trigger touch_user_addresses_updated_at
before update on public.user_addresses
for each row execute function public.touch_updated_at();

drop policy if exists "product_variants_select_public" on public.product_variants;
create policy "product_variants_select_public"
on public.product_variants for select
using (true);

drop policy if exists "product_variants_admin_manage" on public.product_variants;
create policy "product_variants_admin_manage"
on public.product_variants for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "notification_events_select_own_or_admin" on public.notification_events;
create policy "notification_events_select_own_or_admin"
on public.notification_events for select
using (public.is_admin() or user_id = auth.uid());

drop policy if exists "notification_events_insert_own_or_admin" on public.notification_events;
create policy "notification_events_insert_own_or_admin"
on public.notification_events for insert
with check (public.is_admin() or user_id = auth.uid());

drop policy if exists "notification_events_admin_update" on public.notification_events;
create policy "notification_events_admin_update"
on public.notification_events for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "notification_events_admin_delete" on public.notification_events;
create policy "notification_events_admin_delete"
on public.notification_events for delete
using (public.is_admin());

drop policy if exists "user_addresses_manage_own" on public.user_addresses;
create policy "user_addresses_manage_own"
on public.user_addresses for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into public.product_variants (
  product_index,
  device,
  sku,
  stock_quantity,
  low_stock_threshold,
  is_available
)
select
  products.product_index,
  devices.device,
  'VT-' || lpad((products.product_index + 1)::text, 3, '0') || '-' || regexp_replace(upper(devices.device), '[^A-Z0-9]', '', 'g'),
  12,
  3,
  products.is_active
from public.products
cross join (
  values
    ('iPhone 16 Pro'),
    ('iPhone 16'),
    ('iPhone 15 Pro'),
    ('iPhone 15'),
    ('iPhone 14 Pro'),
    ('iPhone 14'),
    ('Galaxy S25'),
    ('Galaxy S24')
) as devices(device)
on conflict (product_index, device) do nothing;
