
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabaseAdmin } from '../app/lib/supabase-admin';

async function optimize() {
    console.log('🧹 Starting Schema Optimization...');

    // We cannot DROP columns via JS client, but we can NULL them out to ensure
    // no data is being read from them, effectively deprecating them.
    // This frees up the data (vacuum will clean it later) and enforces "Source of Truth".

    const { error } = await supabaseAdmin
        .from('wine_pairings')
        .update({
            name: null,
            vintage: null,
            grape: null,
            price: null,
            description: null,
            keywords: null
        } as any)
        .neq('tier', 'invalid_tier'); // Update all rows (tier is enum, this matches all legitimate rows)

    if (error) {
        console.error('❌ Optimization failed:', error);
        process.exit(1);
    }

    console.log('✅ Success! Legacy columns cleared. The app must now rely on the JOINs.');
}

optimize();
