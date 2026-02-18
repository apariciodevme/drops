
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env
config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function benchmarkSave() {
    console.log('🚀 Starting Benchmark: Admin Save (Safe Bulk Insert)');

    // 1. Fetch real data to use as payload
    // We'll just read the local JSON as a baseline source, similar to what the frontend might send
    const tenantId = 'palate';
    const filePath = path.join(process.cwd(), 'data', 'menus', `${tenantId}.json`);
    const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const menuData = rawData.menu;

    console.log(`📝 Payload: ${menuData.length} categories.`);

    const start = performance.now();

    // --- LOGIC START (Copied from admin.ts) ---

    // 1. Delete existing structure
    const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('tenant_id', tenantId);

    if (deleteError) throw new Error('Delete failed: ' + deleteError.message);

    // 2. Prepare Categories
    const categories = menuData.map((cat: any, index: number) => ({
        tenant_id: tenantId,
        name: cat.category,
        sort_order: index
    }));

    const { data: insertedCategories, error: catError } = await supabase
        .from('categories')
        .insert(categories)
        .select('id, name');

    if (catError || !insertedCategories) throw new Error('Insert Categories failed: ' + catError?.message);

    // Map category name to ID
    const catMap = new Map<string, string>();
    insertedCategories.forEach((c: any) => catMap.set(c.name, c.id));

    // 3. Prepare Menu Items
    let allItems: any[] = [];
    menuData.forEach((cat: any) => {
        const catId = catMap.get(cat.category);
        if (!catId) return;

        cat.items.forEach((item: any, itemIndex: number) => {
            allItems.push({
                category_id: catId,
                dish: item.dish,
                price: item.price.toString(),
                sort_order: itemIndex,
                _pairings: item.pairings
            });
        });
    });

    const { data: insertedItems, error: itemError } = await supabase
        .from('menu_items')
        .insert(allItems.map(({ _pairings, ...item }) => item))
        .select('id, dish, category_id');

    if (itemError || !insertedItems) throw new Error('Insert Items failed: ' + itemError?.message);

    // Map (category_id + dish) -> item_id
    const itemMap = new Map<string, string>();
    insertedItems.forEach((item: any) => {
        const key = `${item.category_id}:${item.dish}`;
        itemMap.set(key, item.id);
    });

    // 4. Prepare Pairings
    const pairingsToInsert: any[] = [];
    const tiers = ['byGlass', 'midRange', 'exclusive'] as const;

    menuData.forEach((cat: any) => {
        const catId = catMap.get(cat.category);
        if (!catId) return;

        cat.items.forEach((item: any) => {
            const key = `${catId}:${item.dish}`;
            const itemId = itemMap.get(key);

            if (!itemId) return;

            tiers.forEach(tier => {
                const pairing = item.pairings[tier];
                pairingsToInsert.push({
                    menu_item_id: itemId,
                    tier: tier,
                    name: pairing.name,
                    vintage: pairing.vintage,
                    grape: pairing.grape,
                    price: pairing.price,
                    note: pairing.note,
                    description: pairing.description || null,
                    keywords: pairing.keywords || []
                });
            });
        });
    });

    if (pairingsToInsert.length > 0) {
        const { error: pairError } = await supabase
            .from('wine_pairings')
            .insert(pairingsToInsert);

        if (pairError) throw new Error('Insert Pairings failed: ' + pairError.message);
    }

    // --- LOGIC END ---

    const end = performance.now();
    const duration = (end - start).toFixed(2);

    console.log(`✅ Success!`);
    console.log(`⏱️  Total Time: ${duration}ms`);
    console.log(`📊 Stats:`);
    console.log(`   - Categories: ${insertedCategories.length}`);
    console.log(`   - Items: ${insertedItems.length}`);
    console.log(`   - Pairings: ${pairingsToInsert.length}`);
}

benchmarkSave();
