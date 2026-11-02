-- G1-YIL-20261030-001. Review and test locally before any remote application.
-- Separate sample namespace: does not alter existing production tables.
begin;
create schema if not exists yil_sample;
revoke all on schema yil_sample from public, anon;
grant usage on schema yil_sample to authenticated;
create table yil_sample.stores(id text primary key, name text not null);
create table yil_sample.products(id text primary key, name text not null, category text not null, unit text not null, price integer not null check(price>=0));
create table yil_sample.memberships(user_id uuid primary key references auth.users(id) on delete cascade, store_id text references yil_sample.stores, role text not null check(role in ('store','hq','factory')), check(role <> 'store' or store_id is not null));
create table yil_sample.orders(id uuid primary key default gen_random_uuid(), store_id text not null references yil_sample.stores, created_by uuid not null default auth.uid() references auth.users(id), trace_id uuid not null unique default gen_random_uuid(), created_at timestamptz not null default now(), status text not null default '受付済み' check(status in ('受付済み','準備中','出荷済み')), note text not null default '' check(length(note)<=200));
create table yil_sample.order_items(order_id uuid references yil_sample.orders on delete cascade, product_id text references yil_sample.products, quantity integer not null check(quantity between 1 and 99), primary key(order_id,product_id));
alter table yil_sample.stores enable row level security;
alter table yil_sample.products enable row level security;
alter table yil_sample.memberships enable row level security;
alter table yil_sample.orders enable row level security;
alter table yil_sample.order_items enable row level security;
revoke all on all tables in schema yil_sample from public, anon, authenticated;
grant select on all tables in schema yil_sample to authenticated;
-- Membership provisioning is admin-only. No client write grants, no metadata-based roles.
create policy own_membership on yil_sample.memberships for select to authenticated using(user_id=(select auth.uid()));
create policy member_stores on yil_sample.stores for select to authenticated using(exists(select 1 from yil_sample.memberships m where m.user_id=(select auth.uid()) and (m.store_id=id or m.role in ('hq','factory'))));
create policy member_products on yil_sample.products for select to authenticated using(exists(select 1 from yil_sample.memberships m where m.user_id=(select auth.uid())));
create policy scoped_orders on yil_sample.orders for select to authenticated using(exists(select 1 from yil_sample.memberships m where m.user_id=(select auth.uid()) and (m.store_id=orders.store_id or m.role in ('hq','factory'))));
create policy scoped_items on yil_sample.order_items for select to authenticated using(exists(select 1 from yil_sample.orders o where o.id=order_id));
-- Deliberately read-only until transactional order RPC and auth integration are approved/tested.
commit;
