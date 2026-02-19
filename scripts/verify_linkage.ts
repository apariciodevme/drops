
import * as dotenv from 'dotenv';
import path from 'path';

// Load env before importing supabase
const envPath = path.resolve(process.cwd(), '.env.local');
const result = dotenv.config({ path: envPath });
if (result.error) dotenv.config({ path: '.env' });

async function verify() {
    const { supabaseAdmin } = await import('../app/lib/supabase-admin');

    const { count, error } = await supabaseAdmin
        .from('wine_pairings')
        .select('*', { count: 'exact', head: true })
        .is('wine_id', null);

    if (error) {
        console.error('Check failed:', error);
    } else {
        console.log(`Unlinked Pairings Remaining: ${count}`);
    }
}

verify().catch(console.error);
