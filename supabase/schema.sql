-- Caseform Supabase setup
-- Supabase SQL Editor에서 한 번 실행하세요.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  phone text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_index integer not null,
  product_name text not null,
  product_image text default '',
  price numeric not null default 0,
  device text not null,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_index, device)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_index integer not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  author text not null,
  rating integer not null check (rating between 1 and 5),
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.cart_items enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "cart_items_manage_own" on public.cart_items;
create policy "cart_items_manage_own"
on public.cart_items for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "reviews_select_public" on public.reviews;
create policy "reviews_select_public"
on public.reviews for select
using (true);

drop policy if exists "reviews_insert_auth" on public.reviews;
create policy "reviews_insert_auth"
on public.reviews for insert
with check (auth.uid() = user_id);

drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own"
on public.reviews for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own"
on public.reviews for delete
using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = excluded.name,
    phone = excluded.phone,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.reviews (product_index, user_id, author, rating, title, body)
select 0, id, '민서', 5, '흰 배경에서도 존재감이 좋아요', '아이보리 톤이 너무 밝게 날리지 않고 골드 링이 은은해서 실제로 고급스러워 보입니다.'
from auth.users
limit 1
on conflict do nothing;
