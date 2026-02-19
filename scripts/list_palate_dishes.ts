
import * as dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const result = dotenv.config({ path: envPath });
if (result.error) dotenv.config({ path: '.env' });

async function list() {
    const { supabaseAdmin } = await import('../app/lib/supabase-admin');

    const { data: menu } = await supabaseAdmin
        .from('menu_items')
        .select('id, dish, category_id, categories(name, tenant_id)')
        .eq('categories.tenant_id', 'palate');

    console.log('🍽️  ALL PALATE DISHES:');
    menu?.forEach(m => {
        // @ts-ignore
        console.log(`[${m.id}] ${m.dish} (${m.categories?.name})`);
    });
}
list().catch(console.error);
