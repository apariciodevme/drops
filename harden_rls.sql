-- Security Hardening: Revoke Public Access
-- Run this in your Supabase SQL Editor

-- 1. Drop existing permissive policies
DROP POLICY IF EXISTS "Public read access" ON categories;
DROP POLICY IF EXISTS "Public read access" ON menu_items;
DROP POLICY IF EXISTS "Public read access" ON wine_pairings;
DROP POLICY IF EXISTS "Public write access" ON wine_pairings;

-- 2. Create Restrictive Policies (Default Deny)
-- By default, if no policy matches, Supabase/Postgres denies access.
-- So simply dropping the 'using (true)' policies is enough to lock it down for the public.

-- 3. (Optional) Explicitly allow Service Role (it bypasses RLS anyway, but good for clarity)
-- Note: Service Role bypasses RLS automatically, so no policy needed for it.

-- 4. Verify Tenants Table
-- Ensure tenants table is also locked down
DROP POLICY IF EXISTS "Public read access" ON tenants;

-- Done! Now only the Server (using Service Key) can read/write data.
