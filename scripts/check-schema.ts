import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking column types...');

    // We can't query information_schema directly easily with supabase-js unless we have SQL editor access or raw query access.
    // But we can infer types by try/catch on dummy data or by inspecting the returned data structure if we can fetch one row.

    // 1. Check 'tenants' table
    const { data: tenants, error: tErr } = await supabase.from('tenants').select('*').limit(1);
    if (tErr) console.error('Error fetching tenants:', tErr);
    else console.log('Tenants sample:', tenants);

    // 2. Check 'wine_pairings' table
    const { data: pairings, error: pErr } = await supabase.from('wine_pairings').select('tenant_id').limit(1);
    if (pErr) console.error('Error fetching wine_pairings:', pErr);
    else console.log('Wine Pairings tenant_id sample:', pairings);

    // 3. Try key lookups
    if (tenants?.[0]) {
        console.log('Tenants ID type:', typeof tenants[0].id);
        console.log('Tenants ID value:', tenants[0].id);
    }
}

checkSchema();
