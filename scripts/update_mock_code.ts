
import { config } from 'dotenv';
import path from 'path';

// Load Env Vars FIRST
const envLocalPath = path.resolve(process.cwd(), '.env.local');
let result = config({ path: '.env.local' });
if (result.error) result = config({ path: '.env' });

async function updateAccessCode() {
    // Dynamic import
    const { supabaseAdmin } = await import('@/app/lib/supabase-admin');

    console.log("Updating access code for bistro_mock...");

    // Set to a fixed 4-digit code for simplicity in this session
    const newCode = '1234';

    const { data, error } = await supabaseAdmin
        .from('tenants')
        .update({ access_code: newCode })
        .eq('id', 'bistro_mock')
        .select()
        .single();

    if (error) {
        console.error("❌ Error updating access code:", error.message);
    } else {
        console.log(`✅ Access Code updated for ${data.name}: ${data.access_code}`);
    }
}

updateAccessCode();
