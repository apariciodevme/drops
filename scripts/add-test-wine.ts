
import { config } from 'dotenv';
// Try .env.local first, then .env
let result = config({ path: '.env.local' });
if (result.error) {
    console.log(".env.local not found, trying .env");
    result = config({ path: '.env' });
}

if (result.error) {
    console.error("Error loading .env file:", result.error);
}
console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Found" : "Missing");
console.log("Supabase Service Role Key:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "Found" : "Missing");

import { supabaseAdmin } from '@/app/lib/supabase-admin';
import { saveWine } from '@/app/actions/inventory';

async function addTestWine() {
    console.log("Adding test wine...");

    // 1. Identify Tenant (Hardcoding for 'Palate' based on user context, or fetching first available)
    // We'll search for a tenant named 'Palate' or similar, or just use a known ID if we had one.
    // For now, let's list tenants to be safe, or just insert with a placeholder if we are in dev.
    // Actually, let's just use the tenantId from the session if possible, but we are in a script.
    // Let's assume the user is 'Palate' for now.

    // Wait, the user's `palate.json` is just data. The tenant_id in DB might be different.
    // Use a known tenant_id or fetch one.
    // Let's check if there is a tenants table? `schema.sql` doesn't show one.
    // The `wines` table has `tenant_id` text.
    // The app usually uses a string like "palate" or "drops".
    const tenantId = "palate"; // consistently used in examples involving `palate.json`

    const wine = {
        tenant_id: tenantId,
        name: "Jean Collet Cremant de Bourgogne",
        vintage: "2022",
        // Price is stored as numeric in DB. The user provided "220,- / 1000,-".
        // This looks like Glass / Bottle.
        // The DB `price` column is numeric, likely per bottle.
        // The `pairing-engine` brackets wines by price.
        // We should probably store the bottle price (1000) or maybe we need to update schema?
        // `wines` table: `price numeric`.
        // Let's store 1000.
        price: 1000,
        note: "Bubbles and bread—the ultimate texture match.",
        grape: "Chardonnay",
        description: "Dry and energetic with a fine mousse; features sharp green apple notes and a refreshing citrus finish.",
        stock_status: 'in_stock' as const,
        tags: [] // We'll add tags separately or let the user do it in UI
    };

    // Need to generate UUID for wine.id or let saveWine handle it?
    // saveWine handles it if id is missing.

    const result = await saveWine(wine);

    if (result.success) {
        console.log("✅ Wine added successfully:", result.data);
    } else {
        console.error("❌ Failed to add wine:", result.error);
    }
}

addTestWine().catch(console.error);
