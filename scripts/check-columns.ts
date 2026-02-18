import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
    console.log('Checking wine_pairings columns...');
    // Try to select the column. If it doesn't exist, it should error.
    const { data, error } = await supabase.from('wine_pairings').select('tenant_id').limit(1);

    if (error) {
        console.error('❌ Error selecting tenant_id:', error.message);
        console.error('   Hint: The column "tenant_id" likely does not exist on table "wine_pairings".');
    } else {
        console.log('✅ Success! tenant_id column found.');
    }
}

check();
