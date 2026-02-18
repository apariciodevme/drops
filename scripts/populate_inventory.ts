
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

async function populateInventory() {
    // Dynamic import to ensure env vars are loaded first
    const { supabaseAdmin } = await import('@/app/lib/supabase-admin');

    const TENANT_ID = 'palate';
    console.log(`🔍 Starting inventory population for tenant: ${TENANT_ID}...`);

    // 1. Fetch all wine pairings for the tenant
    console.log("Fetching menu structure...");

    // Get Categories
    const { data: categories, error: catError } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('tenant_id', TENANT_ID);

    if (catError || !categories) {
        console.error("Error fetching categories:", catError);
        return;
    }

    const categoryIds = categories.map(c => c.id);
    console.log(`Found ${categoryIds.length} categories.`);

    // Get Menu Items
    const { data: menuItems, error: itemError } = await supabaseAdmin
        .from('menu_items')
        .select('id')
        .in('category_id', categoryIds);

    if (itemError || !menuItems) {
        console.error("Error fetching menu items:", itemError);
        return;
    }

    const menuItemIds = menuItems.map(i => i.id);
    console.log(`Found ${menuItemIds.length} menu items.`);

    // Get Wine Pairings
    const { data: pairings, error: pairingError } = await supabaseAdmin
        .from('wine_pairings')
        .select('*')
        .in('menu_item_id', menuItemIds);

    if (pairingError || !pairings) {
        console.error("Error fetching wine pairings:", pairingError);
        return;
    }

    console.log(`Found ${pairings.length} total wine pairings.`);

    // 2. Extact Unique Wines
    const uniqueWines = new Map();

    pairings.forEach((p: any) => {
        // Skip empty or placeholder wines
        if (!p.name || p.name.trim() === '') return;

        // Create a unique key (Name + Vendor + Year) roughly
        const key = p.name.trim().toLowerCase();

        if (!uniqueWines.has(key)) {
            uniqueWines.set(key, {
                tenant_id: TENANT_ID,
                name: p.name.trim(),
                grape: p.grape || '',
                vintage: p.vintage || '',
                price: parseFloat(p.price) || 0,
                note: p.note || '',
                description: p.description || p.note || '', // Fallback to note if desc is missing
                stock_status: 'in_stock'
            });
        }
    });

    console.log(`Identified ${uniqueWines.size} unique wines.`);

    // 3. Insert into Wines table
    let insertedCount = 0;
    let errors = 0;

    for (const wine of uniqueWines.values()) {
        const { error } = await supabaseAdmin
            .from('wines')
            .upsert(wine, { onConflict: 'tenant_id, name' as any }) // Assuming we might want to update if exists, or ignore. 
        // Note: 'tenant_id, name' might not be a unique constraint yet. If not, upsert works on PK.
        // Since we don't have PKs yet, we might prefer simple INSERT or checking existence.
        // Let's check if it exists first to avoid duplicates if unique constraint is missing.

        // Check existence first to be safe
        const { data: existing } = await supabaseAdmin
            .from('wines')
            .select('id')
            .eq('tenant_id', TENANT_ID)
            .eq('name', wine.name)
            .single();

        if (existing) {
            console.log(`Skipping existing wine: ${wine.name}`);
            continue;
        }

        const { error: insertError } = await supabaseAdmin
            .from('wines')
            .insert(wine);

        if (insertError) {
            console.error(`Failed to insert ${wine.name}:`, insertError.message);
            errors++;
        } else {
            console.log(`Inserted: ${wine.name}`);
            insertedCount++;
        }
    }

    console.log(`\n✅ Population Complete.`);
    console.log(`Added: ${insertedCount}`);
    console.log(`Errors: ${errors}`);
}

populateInventory().catch(console.error);
