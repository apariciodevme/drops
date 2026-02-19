
import * as dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const result = dotenv.config({ path: envPath });
if (result.error) dotenv.config({ path: '.env' });

async function inspect() {
    const { supabaseAdmin } = await import('../app/lib/supabase-admin');

    // Pairing ID from backup (Palate)
    const pairingId = '6bc050ad-a8cc-4593-8b0e-b66add23da56';

    const { data, error } = await supabaseAdmin
        .from('wine_pairings')
        .select('*')
        .eq('id', pairingId)
        .single();

    if (error) {
        console.log(`❌ Pairing ${pairingId} fetch error:`, error.message);
    } else {
        console.log('✅ Pairing Found:', data);
    }
}
inspect().catch(console.error);
