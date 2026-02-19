
import { config } from 'dotenv';
import path from 'path';

// Load Env Vars
const envLocalPath = path.resolve(process.cwd(), '.env.local');
let result = config({ path: '.env.local' });
if (result.error) result = config({ path: '.env' });
if (result.error) console.warn("⚠️ Could not load .env file. Relying on system env.");

async function generatePairings() {
    // Dynamic import
    const { supabaseAdmin } = await import('@/app/lib/supabase-admin');
    const { calculateMatches, bucketWines } = await import('@/app/lib/pairing-engine');
    const { getWines, getTags } = await import('@/app/actions/inventory');

    const args = process.argv.slice(2);
    const tenantId = args.find(a => a.startsWith('--tenant='))?.split('=')[1];

    if (!tenantId) {
        console.error("Usage: npx tsx scripts/generate_pairings.ts --tenant=slug");
        process.exit(1);
    }

    console.log(`🤖 Generatng Pairings for: ${tenantId}`);

    // 1. Fetch Data
    const wines = await getWines(tenantId);
    if (!wines || wines.length === 0) {
        console.error("❌ No wines found for this tenant.");
        return;
    }
    console.log(`🍷 Found ${wines.length} wines.`);

    const allTags = await getTags();
    console.log(`🏷️ Found ${allTags.length} global tags.`);

    // 2. Fetch Menu Items (Display)
    const { data: categories, error: catError } = await supabaseAdmin
        .from('categories')
        .select('id, menu_items(id, dish, price)')
        .eq('tenant_id', tenantId);

    if (catError) throw new Error(catError.message);

    const menuItems = categories.flatMap(c => c.menu_items);
    console.log(`🍽️ Found ${menuItems.length} menu items.`);

    // 3. Fetch Dishes (Tags)
    const { data: dishesData, error: dishError } = await supabaseAdmin
        .from('dishes')
        .select('id, name, dish_tags(tag_id)')
        .eq('tenant_id', tenantId);

    if (dishError) throw new Error(dishError.message);

    // index dishes by name for quick lookup
    const dishesMap = new Map(); // name -> dish record
    dishesData.forEach((d: any) => {
        dishesMap.set(d.name, d);
    });

    let validPairingsCount = 0;

    // 4. Process Each Menu Item
    for (const item of menuItems) {
        // Find corresponding dish
        const dishRecord = dishesMap.get(item.dish);

        if (!dishRecord) {
            console.log(`⚠️ Scaling ${item.dish}: No matching 'dish' record found.`);
            continue;
        }

        const dishTagIds = dishRecord.dish_tags.map((dt: any) => dt.tag_id);

        if (dishTagIds.length === 0) {
            console.log(`⚠️ Skipping ${item.dish}: No tags.`);
            continue;
        }

        // Run Engine
        const scored = calculateMatches(dishTagIds, wines, allTags);
        const buckets = bucketWines(scored);

        // Prepare Upsert Payloads
        const newPairings = [];

        if (buckets.byGlass.length > 0) {
            newPairings.push({
                menu_item_id: item.id, // Linking to menu_items (Display)
                tier: 'byGlass',
                wine_id: buckets.byGlass[0].id,
                note: `Matched on: ${buckets.byGlass[0].matchReasons.join(', ')}`
            });
        }
        if (buckets.midRange.length > 0) {
            newPairings.push({
                menu_item_id: item.id,
                tier: 'midRange',
                wine_id: buckets.midRange[0].id,
                note: `Matched on: ${buckets.midRange[0].matchReasons.join(', ')}`
            });
        }
        if (buckets.exclusive.length > 0) {
            newPairings.push({
                menu_item_id: item.id,
                tier: 'exclusive',
                wine_id: buckets.exclusive[0].id,
                note: `Matched on: ${buckets.exclusive[0].matchReasons.join(', ')}`
            });
        }

        // 3. Upsert into DB
        if (newPairings.length > 0) {
            await supabaseAdmin.from('wine_pairings')
                .delete()
                .eq('menu_item_id', item.id);

            const { error: insertError } = await supabaseAdmin
                .from('wine_pairings')
                .insert(newPairings);

            if (insertError) {
                console.error(`❌ Error pairing ${item.dish}: ${insertError.message}`);
            } else {
                validPairingsCount++;
                console.log(`✅ ${item.dish}: Paired ${newPairings.length} wines.`);
            }
        } else {
            console.log(`🔸 ${item.dish}: No matches found.`);
        }
    }

    console.log(`\n🎉 Pairing Generation Complete! Updated ${validPairingsCount} dishes.`);
}

generatePairings().catch(console.error);
