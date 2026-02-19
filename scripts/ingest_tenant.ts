
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Load Env Vars
const envLocalPath = path.resolve(process.cwd(), '.env.local');
let result = config({ path: '.env.local' });
if (result.error) result = config({ path: '.env' });
if (result.error) {
    console.warn("⚠️ Could not load .env file. Relying on system env.");
}

async function ingestTenant() {
    // Dynamic import
    const { supabaseAdmin } = await import('@/app/lib/supabase-admin');

    const args = process.argv.slice(2);
    const slug = args.find(a => a.startsWith('--slug='))?.split('=')[1];
    const name = args.find(a => a.startsWith('--name='))?.split('=')[1];
    const winesPath = args.find(a => a.startsWith('--wines='))?.split('=')[1];
    const menuPath = args.find(a => a.startsWith('--menu='))?.split('=')[1];

    if (!slug || !name || !winesPath || !menuPath) {
        console.error("Usage: npx tsx scripts/ingest_tenant.ts --slug=x --name=y --wines=path --menu=path");
        process.exit(1);
    }

    console.log(`🚀 Starting ingestion for tenant: ${name} (${slug})`);

    // 1. Upsert Tenant
    console.log("... Upserting Tenant");

    let accessCode = '';
    let isUnique = false;
    let attempts = 0;

    // Check if we are updating an existing tenant to preserve their code
    const { data: existingTenant } = await supabaseAdmin.from('tenants').select('access_code').eq('id', slug).single();
    if (existingTenant) {
        accessCode = existingTenant.access_code;
        isUnique = true;
    } else {
        // Generate new unique code
        while (!isUnique && attempts < 10) {
            accessCode = Math.floor(1000 + Math.random() * 9000).toString();
            // Check if code exists for ANY OTHER tenant
            const { data: conflict } = await supabaseAdmin.from('tenants').select('id').eq('access_code', accessCode).single();
            if (!conflict) {
                isUnique = true;
            } else {
                console.log(`⚠️ Code ${accessCode} taken, retrying...`);
            }
            attempts++;
        }
        if (!isUnique) throw new Error("Could not generate unique 4-digit code after 10 attempts.");
    }

    const { data: tenant, error: tenantError } = await supabaseAdmin
        .from('tenants')
        .upsert({
            id: slug,
            name: name,
            access_code: accessCode
        }, { onConflict: 'id' })
        .select()
        .single();

    if (tenantError) throw new Error(`Tenant Error: ${tenantError.message}`);
    console.log(`✅ Tenant Ready: ${tenant.id} (Code: ${tenant.access_code})`);

    // 2. Ingest Wines
    console.log("... Processing Wines");
    const winesCsv = fs.readFileSync(winesPath, 'utf-8');
    const winesData = parse(winesCsv, { columns: true, skip_empty_lines: true });

    interface CsvWineRow {
        name: string;
        vintage: string;
        grape: string;
        price: string;
        description: string;
        stock_status: string;
        tags: string;
        [key: string]: any;
    }

    let wineCount = 0;
    for (const r of winesData) {
        const row = r as CsvWineRow;
        // row: name, vintage, grape, price, description, stock_status
        const payload = {
            tenant_id: slug,
            name: row.name,
            vintage: row.vintage,
            grape: row.grape,
            price: parseFloat(row.price) || 0,
            description: row.description,
            stock_status: row.stock_status || 'in_stock',
        };

        // Manual Upsert
        const { data: existingWine } = await supabaseAdmin
            .from('wines')
            .select('id')
            .eq('tenant_id', slug)
            .eq('name', row.name)
            .single();

        let error;
        if (existingWine) {
            const { error: updateError } = await supabaseAdmin
                .from('wines')
                .update(payload)
                .eq('id', existingWine.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabaseAdmin
                .from('wines')
                .insert(payload);
            error = insertError;
        }

        if (error) {
            console.error(`❌ Failed to import wine ${row.name}: ${error.message}`);
        } else {
            wineCount++;

            // Wine Tagging
            let savedWine: any = existingWine; // Reuse or fetch if new
            if (!savedWine) {
                const { data: w2 } = await supabaseAdmin.from('wines').select('id').eq('tenant_id', slug).eq('name', row.name).single();
                savedWine = w2;
            }

            if (savedWine && row.tags) {
                const tagNames = row.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t);
                const tagIds = [];
                for (const tagName of tagNames) {
                    let { data: tag } = await supabaseAdmin.from('tags').select('id').eq('name', tagName).single();
                    if (!tag) {
                        const { data: newTag } = await supabaseAdmin.from('tags').insert({ name: tagName, category: 'Flavor' }).select().single();
                        if (newTag) tag = newTag;
                    }
                    if (tag) tagIds.push(tag.id);
                }

                if (tagIds.length > 0) {
                    await supabaseAdmin.from('wine_tags').delete().eq('wine_id', savedWine.id);
                    const tagsPayload = tagIds.map(tid => ({ wine_id: savedWine.id, tag_id: tid, weight: 5 }));
                    await supabaseAdmin.from('wine_tags').insert(tagsPayload);
                }
            }
        }
    }
    console.log(`✅ Processed ${wineCount} wines.`);

    // 3. Ingest Menu
    console.log("... Processing Menu");
    const menuCsv = fs.readFileSync(menuPath, 'utf-8');
    const menuData = parse(menuCsv, { columns: true, skip_empty_lines: true });

    // Group by Category
    const categoriesMap = new Map();
    menuData.forEach((row: any) => {
        if (!categoriesMap.has(row.category)) {
            categoriesMap.set(row.category, []);
        }
        categoriesMap.get(row.category).push(row);
    });

    let catSort = 1;
    for (const [catName, dishes] of categoriesMap.entries()) {
        // Manual Upsert Category
        let cat;
        const { data: existingCat } = await supabaseAdmin
            .from('categories')
            .select('id')
            .eq('tenant_id', slug)
            .eq('name', catName)
            .single();

        if (existingCat) {
            cat = existingCat;
            await supabaseAdmin.from('categories')
                .update({ sort_order: catSort++ })
                .eq('id', cat.id);
        } else {
            const { data: newCat, error: catError } = await supabaseAdmin
                .from('categories')
                .insert({
                    tenant_id: slug,
                    name: catName,
                    sort_order: catSort++
                })
                .select()
                .single();

            if (catError) {
                console.error(`❌ Category Error ${catName}: ${catError.message}`);
                continue;
            }
            cat = newCat;
        }

        // Upsert Dishes
        let dishSort = 1;
        for (const dishRow of dishes) {

            // 3a. Ensure Dish exists in 'dishes' table (Global/Tenant Library)
            let dishRecord;
            const { data: existingDishRecord } = await supabaseAdmin
                .from('dishes')
                .select('id')
                .eq('tenant_id', slug)
                .eq('name', dishRow.dish_name)
                .single();

            if (existingDishRecord) {
                dishRecord = existingDishRecord;
            } else {
                const { data: newDishRecord, error: dishRecordError } = await supabaseAdmin
                    .from('dishes')
                    .insert({
                        tenant_id: slug,
                        name: dishRow.dish_name,
                        category: catName,
                        price: parseFloat(dishRow.price) || 0
                    })
                    .select()
                    .single();

                if (dishRecordError) {
                    console.error(`❌ Dish Record Error ${dishRow.dish_name}: ${dishRecordError.message}`);
                }
                dishRecord = newDishRecord;
            }

            // 3b. Resolve Tags
            const tagNames = dishRow.tags ? dishRow.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : [];
            const tagIds = [];
            for (const tagName of tagNames) {
                let { data: tag } = await supabaseAdmin.from('tags').select('id').eq('name', tagName).single();
                if (!tag) {
                    const { data: newTag } = await supabaseAdmin.from('tags').insert({ name: tagName, category: 'Flavor' }).select().single();
                    if (newTag) tag = newTag;
                }
                if (tag) tagIds.push(tag.id);
            }

            // 3c. Link Tags to Dish
            if (dishRecord && tagIds.length > 0) {
                await supabaseAdmin.from('dish_tags').delete().eq('dish_id', dishRecord.id);
                const tagsPayload = tagIds.map(tid => ({
                    dish_id: dishRecord.id,
                    tag_id: tid,
                    weight: 5
                }));
                const { error: linkError } = await supabaseAdmin.from('dish_tags').insert(tagsPayload);
                if (linkError) console.error(`⚠️ Tag Link Error for ${dishRow.dish_name}: ${linkError.message}`);
            }

            // 3d. Upsert Menu Item (The display item)
            let menuItem;
            const { data: existingDish } = await supabaseAdmin
                .from('menu_items')
                .select('id')
                .eq('category_id', cat.id)
                .eq('dish', dishRow.dish_name)
                .single();

            const dishPayload = {
                category_id: cat.id,
                dish: dishRow.dish_name,
                price: parseFloat(dishRow.price) || 0,
                sort_order: dishSort++
            };

            if (existingDish) {
                menuItem = existingDish;
                await supabaseAdmin.from('menu_items').update(dishPayload).eq('id', menuItem.id);
            } else {
                const { data: newDish, error: itemError } = await supabaseAdmin
                    .from('menu_items')
                    .insert(dishPayload)
                    .select()
                    .single();

                if (itemError) {
                    console.error(`❌ Menu Item Error ${dishRow.dish_name}: ${itemError.message}`);
                    continue;
                }
                menuItem = newDish;
            }
        }
    }

    console.log("✅ Ingestion Complete!");
}

ingestTenant().catch(console.error);
