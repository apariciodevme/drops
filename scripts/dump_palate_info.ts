
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env before importing supabase
const envPath = path.resolve(process.cwd(), '.env.local');
const result = dotenv.config({ path: envPath });
if (result.error) dotenv.config({ path: '.env' });

const BACKUP_FILE = 'backups/wine_pairings_backup_2026-02-18T23-20-00-866Z.json';

async function dump() {
    console.log('🔍 Dumping Palate Info for Mapping...');
    const { supabaseAdmin } = await import('../app/lib/supabase-admin');

    // 1. Get Active Dishes
    const { data: categories } = await supabaseAdmin
        .from('categories')
        .select(`
            name,
            menu_items (
                id,
                dish,
                price
            )
        `)
        .eq('tenant_id', 'palate');

    console.log('\n🍽️  ACTIVE MENU ITEMS:');
    const dishMap: Record<string, any> = {};
    categories?.forEach(cat => {
        console.log(`\nCategory: ${cat.name}`);
        cat.menu_items.forEach((item: any) => {
            console.log(`  - [${item.id}] ${item.dish} (${item.price})`);
            dishMap[item.id] = item.dish;
        });
    });

    // 2. Get Backup Pairings
    const backupPath = path.resolve(process.cwd(), BACKUP_FILE);
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    const palatePairings = backupData.filter((p: any) => p.tenant_id === 'palate');

    console.log(`\n🍷 BACKUP PAIRINGS (${palatePairings.length}):`);

    // Group by Menu Item ID (Old) to see sets
    const sets: Record<string, any[]> = {};
    palatePairings.forEach((p: any) => {
        if (!sets[p.menu_item_id]) sets[p.menu_item_id] = [];
        sets[p.menu_item_id].push(p);
    });

    Object.keys(sets).forEach(oldId => {
        console.log(`\nOld Set [${oldId}]`);
        sets[oldId].forEach(p => {
            console.log(`  - ${p.tier.toUpperCase()}: ${p.name} | Note: "${p.note}"`);
        });
    });
}

dump().catch(console.error);
