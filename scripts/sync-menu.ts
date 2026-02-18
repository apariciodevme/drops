import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { RestaurantDataSchema } from '../types/menu';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Role Key to bypass RLS

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncMenu(tenantId: string) {
    const filePath = path.join(process.cwd(), 'data', 'menus', `${tenantId}.json`);

    if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found for tenant '${tenantId}' at ${filePath}`);
        process.exit(1);
    }

    console.log(`Reading menu data from ${filePath}...`);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    let data;

    try {
        data = JSON.parse(fileContent);
    } catch (e) {
        console.error('Error: Failed to parse JSON file.');
        process.exit(1);
    }

    // Validate data structure
    const validation = RestaurantDataSchema.safeParse(data);
    if (!validation.success) {
        console.error('Error: Invalid menu data structure.');
        console.error(validation.error.issues);
        process.exit(1);
    }

    console.log(`Pushing menu for '${data.restaurantName}' (${tenantId}) to Supabase (Relational)...`);

    try {
        // 1. Clear existing data
        const { error: deleteError } = await supabase
            .from('categories')
            .delete()
            .eq('tenant_id', tenantId);

        if (deleteError) throw new Error('Delete failed: ' + deleteError.message);

        // 2. Insert Data
        for (let catIndex = 0; catIndex < validation.data.menu.length; catIndex++) {
            const category = validation.data.menu[catIndex];

            const { data: catRecord, error: catError } = await supabase
                .from('categories')
                .insert({
                    tenant_id: tenantId,
                    name: category.category,
                    sort_order: catIndex
                })
                .select()
                .single();

            if (catError || !catRecord) throw new Error('Category insert failed: ' + catError?.message);

            for (let itemIndex = 0; itemIndex < category.items.length; itemIndex++) {
                const item = category.items[itemIndex];

                const { data: itemRecord, error: itemError } = await supabase
                    .from('menu_items')
                    .insert({
                        category_id: catRecord.id,
                        dish: item.dish,
                        price: item.price.toString(),
                        sort_order: itemIndex
                    })
                    .select()
                    .single();

                if (itemError || !itemRecord) throw new Error('Item insert failed: ' + itemError?.message);

                const tiers = ['byGlass', 'midRange', 'exclusive'] as const;
                const pairingsToInsert = tiers.map(tier => ({
                    menu_item_id: itemRecord.id,
                    tenant_id: tenantId,
                    tier: tier,
                    ...item.pairings[tier],
                    description: item.pairings[tier].description || null // Added
                }));

                const { error: pairError } = await supabase
                    .from('wine_pairings')
                    .insert(pairingsToInsert);

                if (pairError) throw new Error('Pairing insert failed: ' + pairError.message);
            }
        }
        console.log('✅ Menu synced successfully!');

        // 3. Revalidate Next.js Cache (if server is running)
        try {
            const revalidateUrl = `http://localhost:3000/api/revalidate?tag=menu&secret=${supabaseKey}`;
            console.log('Triggering cache revalidation at:', revalidateUrl);
            const res = await fetch(revalidateUrl);
            if (res.ok) {
                console.log('✅ Cache revalidated.');
            } else {
                console.warn('⚠️ Cache revalidation failed:', await res.text());
                console.warn('Note: If the dev server is not running, this is expected. You may need to restart the server to see changes.');
            }
        } catch (err) {
            console.warn('⚠️ Could not trigger cache revalidation (server might be down).');
            console.warn('Note: Restart the dev server to see changes.');
        }

    } catch (e: any) {
        console.error('Sync failed:', e.message);
        process.exit(1);
    }
}

const tenantArg = process.argv[2];
if (!tenantArg) {
    console.error('Usage: npx tsx scripts/sync-menu.ts <tenant_id>');
    console.error('Example: npx tsx scripts/sync-menu.ts palate');
    process.exit(1);
}

syncMenu(tenantArg);
