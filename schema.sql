-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. TAGS
create table if not exists tags (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  category text not null, -- 'Flash', 'Body', 'Tannin', 'Acidity', 'Sweetness', 'Type'
  tenant_id text, -- null for global system tags, set for custom tenant tags
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (name, category, tenant_id)
);

-- 2. WINES (Inventory)
create table if not exists wines (
  id uuid default uuid_generate_v4() primary key,
  tenant_id text not null,
  name text not null,
  grape text,
  vintage text,
  price numeric,
  description text,
  image_url text,
  stock_status text default 'in_stock' check (stock_status in ('in_stock', 'out_of_stock')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. DISHES
create table if not exists dishes (
  id uuid default uuid_generate_v4() primary key,
  tenant_id text not null,
  name text not null,
  category text, -- 'Starter', 'Main', 'Dessert'
  price numeric,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. WINE_TAGS (Junction)
create table if not exists wine_tags (
  wine_id uuid references wines(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  weight integer default 5 check (weight >= 1 and weight <= 10),
  primary key (wine_id, tag_id)
);

-- 5. DISH_TAGS (Junction)
create table if not exists dish_tags (
  dish_id uuid references dishes(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  weight integer default 5 check (weight >= 1 and weight <= 10),
  primary key (dish_id, tag_id)
);

-- RLS POLICIES (Simple version for now, relies on service_role for admin tools usually)
alter table tags enable row level security;
alter table wines enable row level security;
alter table dishes enable row level security;
alter table wine_tags enable row level security;
alter table dish_tags enable row level security;

-- Allow read access to everyone (public menu)
create policy "Allow public read access on tags" on tags for select using (true);
create policy "Allow public read access on wines" on wines for select using (true);
create policy "Allow public read access on dishes" on dishes for select using (true);
create policy "Allow public read access on wine_tags" on wine_tags for select using (true);
create policy "Allow public read access on dish_tags" on dish_tags for select using (true);

-- Allow full access to service role (and authenticated users with correct tenant_id if we seek strictness later)
-- For now, we assume the API handles tenant isolation or we use service role.
