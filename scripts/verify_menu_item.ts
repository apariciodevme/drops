
import * as dotenv from 'dotenv';
import path from 'path';

// Load env before importing supabase
const envPath = path.resolve(process.cwd(), '.env.local');
const result = dotenv.config({ path: envPath });
if (result.error) dotenv.config({ path: '.env' });

async function verify() {
    const { supabaseAdmin } = await import('../app/lib/supabase-admin');

    // ID from backup sample 
    const backupMenuItemId = '3ef13cd8-3e81-4e49-9281-f2cda73d875f';

    const { data: item, error } = await supabaseAdmin
        .from('menu_items')
        .select('id, dish, category_id')
        .eq('id', backupMenuItemId)
        .single();

    if (error || !item) {
        console.log(`❌ Menu Item ID ${backupMenuItemId} NOT found in DB.`);
    } else {
        console.log(`✅ Menu Item ID ${backupMenuItemId} found: "${item.dish}"`);
    }
}

verify().catch(console.error);
