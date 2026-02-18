-- Add indices to optimize foreign key joins and sorting
-- Run this in your Supabase SQL Editor

-- 1. Foreign Key Indices (Speed up Joins)
CREATE INDEX IF NOT EXISTS idx_categories_tenant_id ON categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_wine_pairings_menu_item_id ON wine_pairings(menu_item_id);

-- 2. Sorting Indices (Speed up ORDER BY)
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_menu_items_sort_order ON menu_items(sort_order);

-- 3. Composite Indices (Optional but recommended for specific queries)
-- e.g. Finding items by category and sorting them efficiently
CREATE INDEX IF NOT EXISTS idx_menu_items_cat_sort ON menu_items(category_id, sort_order);
