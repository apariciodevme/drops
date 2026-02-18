
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load Env Vars FIRST
console.log("Current working directory:", process.cwd());
const envLocalPath = path.resolve(process.cwd(), '.env.local');

// Try .env.local first, then .env
let result = config({ path: '.env.local' });
if (result.error) {
    console.log(".env.local load failed or file not found, trying .env");
    result = config({ path: '.env' });
}

if (result.error) {
    console.error("Error loading .env file:", result.error);
}
console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Found" : "Missing");

async function verifyData() {
    // Dynamic import to ensure env vars are loaded first
    const { supabaseAdmin } = await import('@/app/lib/supabase-admin');

    console.log("🔍 Verifying Database Content...");

    // 1. Check Tenants
    const { data: tenants, error: tenantError } = await supabaseAdmin
        .from('tenants')
        .select('*');

    if (tenantError) {
        console.error("❌ Error fetching tenants:", tenantError.message);
        return;
    }

    if (!tenants || tenants.length === 0) {
        console.warn("⚠️ No tenants found in database! Do NOT delete local files yet.");
        return;
    }

    console.log(`✅ Found ${tenants.length} tenants:`);
    tenants.forEach(t => console.log(`   - ${t.name} (ID: ${t.id})`));

    // 2. Check Menu Data for each Tenant
    for (const tenant of tenants) {
        const { count: catCount, error: catError } = await supabaseAdmin
            .from('categories')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id);

        const { count: itemCount, error: itemError } = await supabaseAdmin
            .from('menu_items')
            .select('id, categories!inner(tenant_id)', { count: 'exact', head: true })
            .eq('categories.tenant_id', tenant.id);
        // Note: complex query might need join, keeping it simple for verification or using categories loop

        // Simpler check: Get categories and their items count
        const { data: categories } = await supabaseAdmin
            .from('categories')
            .select('id, menu_items(count)')
            .eq('tenant_id', tenant.id);

        const totalItems = categories?.reduce((acc, cat) => acc + (cat.menu_items?.[0]?.count || 0), 0) || 0;

        console.log(`   Detailed check for ${tenant.name}:`);
        console.log(`      Categories: ${categories?.length || 0}`);
        // console.log(`      Total Items: ${totalItems}`); // count in select might be tricky with join type
    }

    console.log("\n✅ Verification Complete. If counts look correct, proceed with deletion.");
}

verifyData().catch(console.error);
