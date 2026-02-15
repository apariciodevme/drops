import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { RestaurantData } from '../types/menu';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TENANTS = ['palate', 'villa_paradiso', 'pastis'];

async function migrateTenant(tenantId: string) {
    const filePath = path.join(process.cwd(), 'data', 'menus', `${tenantId}.json`);

    if (!fs.existsSync(filePath)) {
        console.warn(`Warning: Data file not found for ${tenantId}`);
        return;
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const data: RestaurantData = JSON.parse(rawData);

    console.log(`Migrating ${data.restaurantName} (${tenantId})...`);

    // 1. Clear existing data for this tenant to avoid duplicates during re-runs
    // (Cascading deletes will handle items and pairings)
    const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('tenant_id', tenantId);

    if (deleteError) {
        console.error(`Error clearing old data for ${tenantId}:`, deleteError.message);
        return;
    }

    // 2. Insert Categories and Items
    for (let catIndex = 0; catIndex < data.menu.length; catIndex++) {
        const category = data.menu[catIndex];

        const { data: catRecord, error: catError } = await supabase
            .from('categories')
            .insert({
                tenant_id: tenantId,
                name: category.category,
                sort_order: catIndex
            })
            .select()
            .single();

        if (catError || !catRecord) {
            console.error(`Error inserting category ${category.category}:`, catError?.message);
            continue;
        }

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

            if (itemError || !itemRecord) {
                console.error(`Error inserting item ${item.dish}:`, itemError?.message);
                continue;
            }

            // 3. Insert Pairings
            const tiers = ['byGlass', 'midRange', 'exclusive'] as const;
            for (const tier of tiers) {
                const pairing = item.pairings[tier];

                const { error: pairError } = await supabase
                    .from('wine_pairings')
                    .insert({
                        menu_item_id: itemRecord.id,
                        tier: tier,
                        name: pairing.name,
                        vintage: pairing.vintage,
                        grape: pairing.grape,
                        price: pairing.price,
                        note: pairing.note,
                        description: pairing.description || null, // Added
                        keywords: pairing.keywords || []
                    });

                if (pairError) {
                    console.error(`Error inserting pairing for ${item.dish} (${tier}):`, pairError.message);
                }
            }
        }
    }
    console.log(`✅ ${data.restaurantName} migrated successfully.`);
}

async function runMigration() {
    for (const tenantId of TENANTS) {
        await migrateTenant(tenantId);
    }
}

runMigration();
