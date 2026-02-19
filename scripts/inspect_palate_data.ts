
import * as dotenv from 'dotenv';
import path from 'path';

// Load env before importing supabase
const envPath = path.resolve(process.cwd(), '.env.local');
const result = dotenv.config({ path: envPath });
if (result.error) dotenv.config({ path: '.env' });

async function inspect() {
    const { supabaseAdmin } = await import('../app/lib/supabase-admin');

    console.log("🔍 Inspecting 'palate' data...");

    // 1. Check Wines for Palate
    const { data: wines, error: wineError } = await supabaseAdmin
        .from('wines')
        .select('id, name, tenant_id')
        .eq('tenant_id', 'palate');

    if (wineError) console.error('Wine Error:', wineError);
    console.log(`🍷 Wines found for 'palate': ${wines?.length}`);
    if (wines && wines.length > 0) {
        console.log('Sample Wine:', wines[0]);
    }

    // 2. Check Pairings for Palate (via join on menu_items -> categories -> tenant_id is hard, 
    // but we can check pairings that SHOULD belong to palate if we know the menu_item_ids from backup?
    // actually backup has tenant_id directly on the items, but database wine_pairings table does NOT have tenant_id column.
    // It links to menu_item -> category -> tenant.

    // Let's just dump some pairing entries and see their wine_ids
    const { data: pairings, error: pairingError } = await supabaseAdmin
        .from('wine_pairings')
        .select(`
            id, 
            wine_id,
            menu_item:menu_items!inner (
                id,
                category:categories!inner (
                    tenant_id
                )
            )
        `)
        .eq('menu_items.categories.tenant_id', 'palate')
        .limit(10);

    if (pairingError) {
        console.error('Pairing Error:', pairingError);
    } else {
        console.log(`🔗 Sample Pairings for 'palate': ${pairings?.length}`);
        pairings?.forEach(p => {
            const wineExists = wines?.find(w => w.id === p.wine_id);
            console.log(`   - Pairing ${p.id}: wine_id=${p.wine_id} | Valid Link? ${!!wineExists} | Name: ${wineExists?.name || 'NULL'}`);
        });
    }
}

inspect().catch(console.error);
