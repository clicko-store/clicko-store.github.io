-- Run in Supabase SQL Editor. Never expose service_role keys in GitHub.
create table if not exists public.clicko_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.clicko_products (
 sku text primary key,
 name text not null,
 category text not null default 'PC PARTS',
 sub text not null default '',
 condition text not null default 'มือ2',
 price numeric(12,2),
 warranty text not null default '',
 sold boolean not null default false,
 specs text not null default '',
 note text not null default '',
 image text not null default '',
 updated_at timestamptz not null default now()
);
create or replace function public.clicko_touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now();return new;end $$;
drop trigger if exists clicko_products_touch on public.clicko_products;
create trigger clicko_products_touch before update on public.clicko_products
for each row execute function public.clicko_touch_updated_at();
alter table public.clicko_admins enable row level security;
alter table public.clicko_products enable row level security;
drop policy if exists "admins can read self" on public.clicko_admins;
create policy "admins can read self" on public.clicko_admins for select to authenticated using (user_id=auth.uid());
drop policy if exists "public read products" on public.clicko_products;
create policy "public read products" on public.clicko_products for select to anon,authenticated using (true);
drop policy if exists "admins insert products" on public.clicko_products;
create policy "admins insert products" on public.clicko_products for insert to authenticated with check (exists(select 1 from public.clicko_admins where user_id=auth.uid()));
drop policy if exists "admins update products" on public.clicko_products;
create policy "admins update products" on public.clicko_products for update to authenticated using (exists(select 1 from public.clicko_admins where user_id=auth.uid())) with check (exists(select 1 from public.clicko_admins where user_id=auth.uid()));
drop policy if exists "admins delete products" on public.clicko_products;
create policy "admins delete products" on public.clicko_products for delete to authenticated using (exists(select 1 from public.clicko_admins where user_id=auth.uid()));
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects for select to anon,authenticated using (bucket_id='product-images');
drop policy if exists "admins upload product images" on storage.objects;
create policy "admins upload product images" on storage.objects for insert to authenticated with check (bucket_id='product-images' and exists(select 1 from public.clicko_admins where user_id=auth.uid()));
-- AFTER creating your Auth user, run this with its actual UID:
-- insert into public.clicko_admins(user_id) values ('YOUR-AUTH-USER-UUID');
