
import { config } from 'dotenv';
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
    process.exit(1);
}

async function linkPairings() {
    // Dynamic import to ensure env vars are loaded first
    const { supabaseAdmin } = await import('@/app/lib/supabase-admin');

    const TENANT_ID = 'palate';
    console.log(`🔍 Starting pairing linkage for tenant: ${TENANT_ID}...`);

    // 1. Fetch Inventory Wines
    console.log("Fetching inventory wines...");
    const { data: inventoryWines, error: wineError } = await supabaseAdmin
        .from('wines')
        .select('id, name')
        .eq('tenant_id', TENANT_ID);

    if (wineError || !inventoryWines) {
        console.error("Error fetching inventory wines:", wineError);
        return;
    }

    // Create lookup map (lower case name -> id)
    const wineMap = new Map<string, string>();
    inventoryWines.forEach(w => wineMap.set(w.name.trim().toLowerCase(), w.id));
    console.log(`Loaded ${inventoryWines.length} wines into lookup map.`);

    // 2. Fetch Menu Items & Pairings
    console.log("Fetching wine pairings...");

    // Get Categories
    const { data: categories } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('tenant_id', TENANT_ID);

    if (!categories) return;
    const categoryIds = categories.map(c => c.id);

    // Get Menu Items
    const { data: menuItems } = await supabaseAdmin
        .from('menu_items')
        .select('id')
        .in('category_id', categoryIds);

    if (!menuItems) return;
    const menuItemIds = menuItems.map(i => i.id);

    // Get Pairings
    const { data: pairings, error: pairingError } = await supabaseAdmin
        .from('wine_pairings')
        .select('id, name')
        .in('menu_item_id', menuItemIds);

    if (pairingError || !pairings) {
        console.error("Error fetching pairings:", pairingError);
        return;
    }
    console.log(`Found ${pairings.length} pairings to check.`);

    // 3. Link records
    let linkedCount = 0;
    let missingCount = 0;

    for (const p of pairings) {
        if (!p.name) continue;

        const key = p.name.trim().toLowerCase();
        const wineId = wineMap.get(key);

        if (wineId) {
            const { error: updateError } = await supabaseAdmin
                .from('wine_pairings')
                .update({ wine_id: wineId })
                .eq('id', p.id);

            if (updateError) {
                console.error(`Failed to update pairing ${p.id}:`, updateError);
            } else {
                // console.log(`Linked "${p.name}" -> ${wineId}`); // verbose
                linkedCount++;
            }
        } else {
            console.warn(`No inventory match for: "${p.name}"`);
            missingCount++;
        }
    }

    console.log(`\n✅ Linkage Complete.`);
    console.log(`Linked: ${linkedCount}`);
    console.log(`Missing/Unmatched: ${missingCount}`);
}

linkPairings().catch(console.error);
