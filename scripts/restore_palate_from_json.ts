
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const result = dotenv.config({ path: envPath });
if (result.error) dotenv.config({ path: '.env' });

const DATA_FILE = 'data/palate_restore.json';

async function restore() {
    console.log('🔄 Starting Palate Restoration from JSON...');
    const { supabaseAdmin } = await import('../app/lib/supabase-admin');

    // 1. Process Data File
    const dataPath = path.resolve(process.cwd(), DATA_FILE);
    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const menuData = rawData.menu;

    // 2. Fetch Active Dishes for Palate
    const { data: categories } = await supabaseAdmin
        .from('categories')
        .select(`
            id,
            name,
            menu_items (
                id,
                dish
            )
        `)
        .eq('tenant_id', 'palate');

    // Map Dish Name -> ID
    const dishMap: Record<string, string> = {};
    categories?.forEach((cat: any) => {
        cat.menu_items.forEach((item: any) => {
            dishMap[item.dish.trim().toLowerCase()] = item.id;
        });
    });

    console.log(`🍽️  Mapped ${Object.keys(dishMap).length} active dishes.`);

    // 3. Fetch Wines
    const { data: wines } = await supabaseAdmin.from('wines').select('*');
    if (!wines) throw new Error("Failed to fetch wines");
    console.log(`🍷 Fetched ${wines.length} existing wines.`);

    let successCount = 0;

    for (const cat of menuData) {
        for (const item of cat.items) {
            const dishName = item.dish.trim();
            const dishId = dishMap[dishName.toLowerCase()];

            if (!dishId) {
                console.error(`❌ Dish not found in DB: "${dishName}"`);
                continue;
            }

            // Clear existing pairings first
            await supabaseAdmin.from('wine_pairings').delete().eq('menu_item_id', dishId);

            // Process Pairings
            const tiers = ['byGlass', 'midRange', 'exclusive'];
            for (const tier of tiers) {
                const pairing = item.pairings[tier];
                if (!pairing) continue;

                const wineName = pairing.name;

                // Find or Create Wine
                let wineId = wines.find(w => w.name.toLowerCase() === wineName.toLowerCase() && w.tenant_id === 'palate')?.id;

                if (!wineId) {
                    // console.log(`➕ Creating wine: ${wineName}`);
                    const payload = {
                        tenant_id: 'palate',
                        name: wineName,
                        vintage: pairing.vintage || '',
                        grape: pairing.grape || '',
                        price: parseFloat(pairing.price?.toString().replace(/[^0-9.]/g, '') || '0'),
                        description: '', // JSON doesn't have description, unfortuantely 
                        stock_status: 'in_stock'
                    };

                    const { data: newWine, error } = await supabaseAdmin
                        .from('wines')
                        .insert(payload)
                        .select()
                        .single();

                    if (error) {
                        console.error(`❌ Failed to create wine ${wineName}:`, error.message);
                        continue;
                    }
                    wineId = newWine.id;
                    wines.push(newWine);
                }

                // Insert Pairing
                const { error: insertError } = await supabaseAdmin
                    .from('wine_pairings')
                    .insert({
                        menu_item_id: dishId,
                        tier: tier,
                        wine_id: wineId,
                        note: pairing.note
                    });

                if (insertError) {
                    console.error(`❌ Failed to link ${dishName} -> ${wineName}:`, insertError.message);
                } else {
                    successCount++;
                }
            }
        }
    }

    console.log(`🎉 Restoration Complete. Restored ${successCount} pairings.`);
}

restore().catch(console.error);
