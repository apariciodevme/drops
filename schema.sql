-- 1. Create Categories Table
create table categories (
  id uuid default gen_random_uuid() primary key,
  tenant_id text references tenants(id) on delete cascade not null,
  name text not null,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Menu Items Table
create table menu_items (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references categories(id) on delete cascade not null,
  dish text not null,
  price text,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Wine Pairings Table
create table wine_pairings (
  id uuid default gen_random_uuid() primary key,
  menu_item_id uuid references menu_items(id) on delete cascade not null,
  tier text not null check (tier in ('byGlass', 'midRange', 'exclusive')),
  
  -- Wine Details
  name text,
  vintage text,
  grape text,
  price text,
  note text,
  description text, -- Added for detailed wine info
  keywords text[], -- Array of strings
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure one pairing per tier per item
  unique(menu_item_id, tier)
);

-- 4. Enable RLS (Row Level Security) - Optional but recommended
alter table categories enable row level security;
alter table menu_items enable row level security;
alter table wine_pairings enable row level security;

-- For now, allow public access to match current 'tenants' setup (or existing policies)
-- You might want to restrict write access in production
create policy "Public read access" on categories for select using (true);
create policy "Public read access" on menu_items for select using (true);
create policy "Public read access" on wine_pairings for select using (true);
create policy "Public write access" on categories for all using (true);
create policy "Public write access" on menu_items for all using (true);
create policy "Public write access" on wine_pairings for all using (true);
