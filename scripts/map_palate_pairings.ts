
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const result = dotenv.config({ path: envPath });
if (result.error) dotenv.config({ path: '.env' });

const BACKUP_FILE = 'backups/wine_pairings_backup_2026-02-18T23-20-00-866Z.json';

const P_MAP: Record<string, string> = {
    '3ef13cd8-3e81-4e49-9281-f2cda73d875f': 'a93744b6-4cb5-43c4-981c-1dee9c3d0d2b', // Bread
    '96701217-d4ab-47c3-b02b-3c252e3382fa': '7e8f2ff3-83dc-4bfe-9f54-2740f759c3cc', // Olives
    'd893c778-b348-49f0-b5bd-e174d80cabc3': 'bb03acca-8da4-4819-8672-80529f74b064', // Ham
    '1406debc-c05f-4af1-b4c6-3d94743c0157': 'e11c9c39-e05a-4467-82d4-41e11f377670', // Camembert
    '327ee6a1-681c-4fb3-b0e3-2a2a0b5feebf': '91f3d27a-dc01-44c1-bb2d-441a94b8eb70', // Oysters
    '6b085f2b-3a47-41cc-9ab2-0bde528503d5': '7185b2a5-0188-4dc9-bfe4-cd40203933ad', // Blinis
    '3bb3801d-9e9c-478e-99ac-c96e280193aa': 'ba4202b6-17ea-4ccd-96f4-df3ea31d202c', // Croquettes
    'd7e81d4d-bf09-4f98-b9ad-55389a5f0928': 'ffcf73af-51c9-4e4c-a041-b7dbe5a26c02', // Tartare
    'b1aa192d-3738-4205-a7e9-2f1aba610e19': '1a6f9c92-ed05-4cff-a149-1c8a9b7c6a17', // Cabbage
    '9fc93514-891c-4ae0-a5d5-bb18b8a610c2': '72aab2d3-7d0b-4216-8657-51b0d810ce5f', // Scallop
    '66f0ddf6-b29b-419d-8def-85885dfce4ca': '483f9a97-18f5-42ad-b8db-a0bd1920fbbb', // Orzo
    'f2495d6d-1635-4a05-9219-e8fef5acebda': '3f1770e8-33db-4636-994d-075789c2319c', // Cannelloni
    '0ee54f4d-a454-4bf8-adc0-b72a70638fda': 'd5e799e8-e7cd-4128-9c43-30b3c318ee3d', // Duck
    'cce79816-1a5d-418b-a48d-8ee31c1c7acf': '9cec1be3-0d68-46fb-ac3c-c74c21d1385c', // Halibut
    'f951df26-9ce5-4f83-84b7-1be07a11c26c': 'e82ce087-e80f-41e6-9c35-9b1c5fa430e4', // Turbot
    '964ecc73-cdf8-4a38-86cb-efc486bdd030': 'ec42bdbb-5d0c-438a-981a-73abcabb67af', // Entrecote
    '4a558ecb-c8a3-4250-90b1-cc832d01f48e': '5d74007f-76f8-4f33-9f4f-012eb3a916d4', // Omaha
    '182feeb2-0167-43a8-87d6-a05266e2af16': 'f984fa65-7b66-41f9-af6c-b1e8c2931f8c' // Rossini
};

async function remap() {
    const { supabaseAdmin } = await import('../app/lib/supabase-admin');
    console.log('🔄 Starting INSERTION of Palate Pairings...');

    // 1. Process Backup
    const backupPath = path.resolve(process.cwd(), BACKUP_FILE);
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    const palatePairings = backupData.filter((p: any) => p.tenant_id === 'palate');
    console.log(`📄 Found ${palatePairings.length} palate pairings in backup.`);

    // 2. Fetch Wines for Resolution
    const { data: wines, error: wineError } = await supabaseAdmin.from('wines').select('*');
    if (wineError) throw wineError;
    console.log(`🍷 Fetched ${wines.length} wines.`);

    // 3. Clear existing empty pairings for mapped targets (once per target)
    // To avoid deleting the ones we just inserted if multiple old IDs map to same new ID (unlikely)
    // We'll iterate the MAP values and delete first.
    const targetIds = new Set(Object.values(P_MAP));
    console.log(`🧹 Clearing existing pairings for ${targetIds.size} dishes...`);

    for (const newId of targetIds) {
        const { error: delError } = await supabaseAdmin
            .from('wine_pairings')
            .delete()
            .eq('menu_item_id', newId);
        if (delError) console.error(`❌ Failed to clear ${newId}:`, delError.message);
    }

    // 4. Insert Pairings
    let successCount = 0;
    for (const item of palatePairings) {
        // Only process if we have a mapping for this item
        const newMenuItemId = P_MAP[item.menu_item_id];
        if (!newMenuItemId) {
            // console.warn(`⚠️ No mapping for old item ${item.menu_item_id}. Skipping.`);
            continue;
        }

        // Resolve Wine ID
        let targetWineId = item.wine_id;
        if (targetWineId) {
            const exists = wines.find(w => w.id === targetWineId);
            if (!exists) targetWineId = null;
        }

        if (!targetWineId && item.name) {
            const match = wines.find(w => w.name.toLowerCase() === item.name.toLowerCase() && w.tenant_id === item.tenant_id);
            if (match) targetWineId = match.id;
        }

        if (!targetWineId) {
            console.error(`❌ Could not resolve wine for "${item.name}" (Dish: ${newMenuItemId}). Skipping.`);
            continue;
        }

        // Insert
        const { error: insertError } = await supabaseAdmin
            .from('wine_pairings')
            .insert({
                menu_item_id: newMenuItemId,
                tier: item.tier,
                wine_id: targetWineId,
                note: item.note
            });

        if (insertError) {
            console.error(`❌ Insert failed for ${newMenuItemId}/${item.tier}:`, insertError.message);
        } else {
            successCount++;
        }
    }

    console.log(`🎉 Finished. Total inserted: ${successCount}`);
}

remap().catch(console.error);
