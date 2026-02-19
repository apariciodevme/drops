
import { config } from 'dotenv';
import path from 'path';

// Load Env Vars FIRST
const envLocalPath = path.resolve(process.cwd(), '.env.local');
let result = config({ path: '.env.local' });
if (result.error) result = config({ path: '.env' });

async function getAccessCode() {
    // Dynamic import to ensure process.env is populated
    const { supabaseAdmin } = await import('@/app/lib/supabase-admin');

    const { data } = await supabaseAdmin
        .from('tenants')
        .select('access_code')
        .eq('id', 'bistro_mock')
        .single();

    if (data) {
        console.log(`🔑 Access Code for bistro_mock: ${data.access_code}`);
    } else {
        console.error("❌ Could not find bistro_mock tenant.");
    }
}

getAccessCode();
