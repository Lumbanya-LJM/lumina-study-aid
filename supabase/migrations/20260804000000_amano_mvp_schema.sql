-- =============================================================
-- AMANO MVP schema
-- Modules: users, businesses, products, inventory, sales, dashboard
-- =============================================================

-- ---------- Enums ----------
create type public.app_role as enum ('business_owner', 'staff', 'system_admin');
create type public.movement_type as enum ('stock_in', 'stock_out', 'adjustment', 'sale');
create type public.payment_method as enum ('cash', 'mobile_money', 'card', 'bank_transfer', 'credit');

-- ---------- Module 1: User Management ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Module 2: Business Management ----------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  industry text,
  email text,
  phone text,
  address text,
  city text,
  country text not null default 'Zambia',
  currency_code text not null default 'ZMW',
  operating_hours text,
  logo_url text,
  -- staff join the business by entering this code at registration
  join_code text not null unique default upper(substr(md5(random()::text), 1, 8)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null default 'staff',
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table public.business_locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  address text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.business_locations enable row level security;

-- Security definer helpers keep RLS policies free of recursive lookups
create or replace function public.is_business_member(_business_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.business_members
    where business_id = _business_id and user_id = _user_id
  );
$$;

create or replace function public.is_business_owner(_business_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.business_members
    where business_id = _business_id and user_id = _user_id and role = 'business_owner'
  );
$$;

create or replace function public.shares_business_with(_other_user uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.business_members mine
    join public.business_members theirs on theirs.business_id = mine.business_id
    where mine.user_id = auth.uid() and theirs.user_id = _other_user
  );
$$;

-- profiles policies (need shares_business_with, so declared here)
create policy "Users can view own or teammate profiles"
  on public.profiles for select
  using (id = auth.uid() or public.shares_business_with(id));

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

-- businesses policies
create policy "Members can view business"
  on public.businesses for select
  using (public.is_business_member(id));

create policy "Authenticated users can create a business"
  on public.businesses for insert to authenticated
  with check (owner_id = auth.uid());

create policy "Owners can update business"
  on public.businesses for update
  using (public.is_business_owner(id));

create policy "Owners can delete business"
  on public.businesses for delete
  using (owner_id = auth.uid());

-- business_members policies
create policy "Members can view membership of their business"
  on public.business_members for select
  using (public.is_business_member(business_id));

-- Membership rows are normally created via create_business()/join_business()
-- (security definer); direct inserts are owner-only.
create policy "Owners can add members"
  on public.business_members for insert to authenticated
  with check (public.is_business_owner(business_id));

create policy "Owners can update member roles"
  on public.business_members for update
  using (public.is_business_owner(business_id));

create policy "Owners can remove members, members can leave"
  on public.business_members for delete
  using (public.is_business_owner(business_id) or user_id = auth.uid());

-- business_locations policies
create policy "Members can view locations"
  on public.business_locations for select
  using (public.is_business_member(business_id));

create policy "Owners can manage locations"
  on public.business_locations for all
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

-- Creating a business also registers the creator as its owner-member.
create or replace function public.create_business(
  _name text,
  _industry text default null,
  _phone text default null,
  _email text default null,
  _address text default null,
  _city text default null,
  _operating_hours text default null
)
returns public.businesses
language plpgsql security definer set search_path = public
as $$
declare
  _business public.businesses;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.businesses (owner_id, name, industry, phone, email, address, city, operating_hours)
  values (auth.uid(), _name, _industry, _phone, _email, _address, _city, _operating_hours)
  returning * into _business;

  insert into public.business_members (business_id, user_id, role)
  values (_business.id, auth.uid(), 'business_owner');

  insert into public.business_locations (business_id, name, address, is_primary)
  values (_business.id, 'Main Location', _address, true);

  return _business;
end;
$$;

-- Staff self-service: join an existing business with its join code.
create or replace function public.join_business(_join_code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  _business_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select id into _business_id
  from public.businesses
  where join_code = upper(trim(_join_code));

  if _business_id is null then
    raise exception 'Invalid join code';
  end if;

  insert into public.business_members (business_id, user_id, role)
  values (_business_id, auth.uid(), 'staff')
  on conflict (business_id, user_id) do nothing;

  return _business_id;
end;
$$;

-- ---------- Module 3: Product Management ----------
create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  category_id uuid references public.product_categories (id) on delete set null,
  name text not null,
  sku text,
  description text,
  selling_price numeric(12,2) not null default 0,
  cost_price numeric(12,2) not null default 0,
  image_url text,
  current_stock integer not null default 0,
  low_stock_threshold integer not null default 5,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_products_business on public.products (business_id);

alter table public.product_categories enable row level security;
alter table public.products enable row level security;

create policy "Members can view categories"
  on public.product_categories for select
  using (public.is_business_member(business_id));

create policy "Members can manage categories"
  on public.product_categories for all
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "Members can view products"
  on public.products for select
  using (public.is_business_member(business_id));

create policy "Members can manage products"
  on public.products for all
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

-- ---------- Module 4: Inventory Management ----------
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  movement_type public.movement_type not null,
  -- signed: positive adds stock, negative removes it
  quantity_change integer not null,
  note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_movements_business on public.inventory_movements (business_id, created_at desc);
create index idx_movements_product on public.inventory_movements (product_id);

alter table public.inventory_movements enable row level security;

create policy "Members can view movements"
  on public.inventory_movements for select
  using (public.is_business_member(business_id));

create policy "Members can record movements"
  on public.inventory_movements for insert to authenticated
  with check (public.is_business_member(business_id) and created_by = auth.uid());

-- Keep products.current_stock in sync with movements
create or replace function public.apply_inventory_movement()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.products
  set current_stock = current_stock + new.quantity_change,
      updated_at = now()
  where id = new.product_id;
  return new;
end;
$$;

create trigger on_inventory_movement
  after insert on public.inventory_movements
  for each row execute function public.apply_inventory_movement();

-- ---------- Module 5: Sales Management (+ customers) ----------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_customers_business on public.customers (business_id);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  sale_number bigint not null,
  total_amount numeric(12,2) not null default 0,
  payment_method public.payment_method not null default 'cash',
  note text,
  created_by uuid references auth.users (id) on delete set null,
  sold_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (business_id, sale_number)
);

create index idx_sales_business on public.sales (business_id, sold_at desc);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  line_total numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index idx_sale_items_sale on public.sale_items (sale_id);
create index idx_sale_items_business on public.sale_items (business_id);

alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

create policy "Members can view customers"
  on public.customers for select
  using (public.is_business_member(business_id));

create policy "Members can manage customers"
  on public.customers for all
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "Members can view sales"
  on public.sales for select
  using (public.is_business_member(business_id));

create policy "Members can view sale items"
  on public.sale_items for select
  using (public.is_business_member(business_id));

-- Sales are written through record_sale() so the sale, its items and the
-- stock movements commit atomically.
create or replace function public.record_sale(
  _business_id uuid,
  _items jsonb,                    -- [{product_id, quantity, unit_price}]
  _customer_id uuid default null,
  _payment_method public.payment_method default 'cash',
  _note text default null,
  _sold_at timestamptz default now()
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  _sale_id uuid;
  _sale_number bigint;
  _total numeric(12,2) := 0;
  _item jsonb;
  _product_id uuid;
  _qty integer;
  _price numeric(12,2);
begin
  if not public.is_business_member(_business_id) then
    raise exception 'Not a member of this business';
  end if;

  if _items is null or jsonb_array_length(_items) = 0 then
    raise exception 'A sale needs at least one item';
  end if;

  select coalesce(max(sale_number), 1000) + 1 into _sale_number
  from public.sales where business_id = _business_id;

  insert into public.sales (business_id, customer_id, sale_number, payment_method, note, created_by, sold_at)
  values (_business_id, _customer_id, _sale_number, _payment_method, _note, auth.uid(), coalesce(_sold_at, now()))
  returning id into _sale_id;

  for _item in select * from jsonb_array_elements(_items)
  loop
    _product_id := (_item ->> 'product_id')::uuid;
    _qty := (_item ->> 'quantity')::integer;
    _price := (_item ->> 'unit_price')::numeric;

    if _qty is null or _qty <= 0 then
      raise exception 'Item quantity must be positive';
    end if;

    if not exists (select 1 from public.products where id = _product_id and business_id = _business_id) then
      raise exception 'Product does not belong to this business';
    end if;

    insert into public.sale_items (sale_id, business_id, product_id, quantity, unit_price, line_total)
    values (_sale_id, _business_id, _product_id, _qty, _price, _qty * _price);

    insert into public.inventory_movements (business_id, product_id, movement_type, quantity_change, note, created_by)
    values (_business_id, _product_id, 'sale', -_qty, 'Sale #' || _sale_number, auth.uid());

    _total := _total + (_qty * _price);
  end loop;

  update public.sales set total_amount = _total where id = _sale_id;

  return _sale_id;
end;
$$;

-- ---------- Module 6: Business Intelligence Dashboard ----------
create or replace function public.dashboard_metrics(
  _business_id uuid,
  _from timestamptz,
  _to timestamptz
)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  _result jsonb;
begin
  if not public.is_business_member(_business_id) then
    raise exception 'Not a member of this business';
  end if;

  select jsonb_build_object(
    'revenue', coalesce((select sum(total_amount) from public.sales
      where business_id = _business_id and sold_at between _from and _to), 0),
    'sales_count', coalesce((select count(*) from public.sales
      where business_id = _business_id and sold_at between _from and _to), 0),
    'items_sold', coalesce((select sum(si.quantity) from public.sale_items si
      join public.sales s on s.id = si.sale_id
      where si.business_id = _business_id and s.sold_at between _from and _to), 0),
    'active_customers', coalesce((select count(distinct customer_id) from public.sales
      where business_id = _business_id and sold_at between _from and _to and customer_id is not null), 0),
    'total_customers', coalesce((select count(*) from public.customers
      where business_id = _business_id), 0),
    'total_products', coalesce((select count(*) from public.products
      where business_id = _business_id and is_active), 0),
    'low_stock_count', coalesce((select count(*) from public.products
      where business_id = _business_id and is_active and current_stock <= low_stock_threshold), 0),
    'inventory_value', coalesce((select sum(current_stock * cost_price) from public.products
      where business_id = _business_id and is_active and current_stock > 0), 0),
    'profit', coalesce((select sum(si.line_total - (si.quantity * p.cost_price))
      from public.sale_items si
      join public.products p on p.id = si.product_id
      join public.sales s on s.id = si.sale_id
      where si.business_id = _business_id and s.sold_at between _from and _to), 0)
  ) into _result;

  return _result;
end;
$$;

create or replace function public.revenue_trend(
  _business_id uuid,
  _from timestamptz,
  _to timestamptz
)
returns table (day date, revenue numeric, sales_count bigint)
language sql stable security definer set search_path = public
as $$
  select d.day::date,
         coalesce(sum(s.total_amount), 0) as revenue,
         count(s.id) as sales_count
  from generate_series(date_trunc('day', _from), date_trunc('day', _to), interval '1 day') as d(day)
  left join public.sales s
    on s.business_id = _business_id
   and s.sold_at >= d.day
   and s.sold_at < d.day + interval '1 day'
  where public.is_business_member(_business_id)
  group by d.day
  order by d.day;
$$;

create or replace function public.best_sellers(
  _business_id uuid,
  _from timestamptz,
  _to timestamptz,
  _limit integer default 5
)
returns table (product_id uuid, product_name text, image_url text, units_sold bigint, revenue numeric)
language sql stable security definer set search_path = public
as $$
  select p.id, p.name, p.image_url,
         sum(si.quantity)::bigint as units_sold,
         sum(si.line_total) as revenue
  from public.sale_items si
  join public.products p on p.id = si.product_id
  join public.sales s on s.id = si.sale_id
  where si.business_id = _business_id
    and s.sold_at between _from and _to
    and public.is_business_member(_business_id)
  group by p.id, p.name, p.image_url
  order by units_sold desc
  limit _limit;
$$;

create or replace function public.top_customers(
  _business_id uuid,
  _from timestamptz,
  _to timestamptz,
  _limit integer default 5
)
returns table (customer_id uuid, customer_name text, orders bigint, total_spent numeric)
language sql stable security definer set search_path = public
as $$
  select c.id, c.full_name,
         count(s.id)::bigint as orders,
         coalesce(sum(s.total_amount), 0) as total_spent
  from public.customers c
  join public.sales s on s.customer_id = c.id
  where c.business_id = _business_id
    and s.sold_at between _from and _to
    and public.is_business_member(_business_id)
  group by c.id, c.full_name
  order by total_spent desc
  limit _limit;
$$;

-- ---------- updated_at maintenance ----------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_profiles before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger touch_businesses before update on public.businesses
  for each row execute function public.touch_updated_at();
create trigger touch_products before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------- Product image storage ----------
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Authenticated users can upload product images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images');

create policy "Authenticated users can update own product images"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and owner = auth.uid());

create policy "Authenticated users can delete own product images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and owner = auth.uid());
