
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env before importing supabase
const envPath = path.resolve(process.cwd(), '.env.local');
const result = dotenv.config({ path: envPath });
if (result.error) dotenv.config({ path: '.env' });

const BACKUP_FILE = 'backups/wine_pairings_backup_2026-02-18T23-20-00-866Z.json';

async function restore() {
    console.log('🚑 Starting Restoration Process...');

    // Dynamic import to ensure process.env is populated
    const { supabaseAdmin } = await import('../app/lib/supabase-admin');

    // 1. Load Backup
    const backupPath = path.resolve(process.cwd(), BACKUP_FILE);
    if (!fs.existsSync(backupPath)) {
        console.error('❌ Backup file not found!', backupPath);
        process.exit(1);
    }
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    console.log(`📂 Loaded ${backupData.length} pairings from backup.`);

    // 2. Fetch Existing Wines
    const { data: wines, error: wineError } = await supabaseAdmin.from('wines').select('*');
    if (wineError) throw wineError;
    console.log(`🍷 Fetched ${wines.length} existing wines from inventory.`);

    // 3. Process Pairings
    let restoredCount = 0;
    let createdWineCount = 0;

    for (const item of backupData) {
        let targetWineId = item.wine_id;

        // Verify if this wine_id actually exists in DB if present
        if (targetWineId) {
            const exists = wines.find(w => w.id === targetWineId);
            if (!exists) {
                // console.warn(`⚠️ Backup wine_id ${targetWineId} not found in DB. Will search by name.`);
                targetWineId = null;
            }
        }

        // If no valid ID, search by name
        if (!targetWineId && item.name) {
            // Fuzzyish matching: exact name match for now, maybe case insensitive
            const match = wines.find(w => w.name.toLowerCase() === item.name.toLowerCase() && w.tenant_id === item.tenant_id);
            if (match) {
                targetWineId = match.id;
            }
        }

        // If STILL no ID, and we have name data, we must create a "Legacy" wine entry
        if (!targetWineId && item.name) {
            console.log(`➕ Creating new wine for "${item.name}"...`);
            const payload = {
                tenant_id: item.tenant_id,
                name: item.name,
                vintage: item.vintage || '',
                grape: item.grape || '',
                price: parseFloat(item.price?.replace(/[^0-9.]/g, '') || '0'),
                description: item.description || '',
                stock_status: 'in_stock'
            };

            const { data: newWine, error: createError } = await supabaseAdmin
                .from('wines')
                .insert(payload)
                .select()
                .single();

            if (createError) {
                console.error(`❌ Failed to create wine ${item.name}:`, createError.message);
                continue;
            }

            targetWineId = newWine.id;
            wines.push(newWine);
            createdWineCount++;
        }

        // 4. Update the Pairing Record
        if (targetWineId) {
            const { error: updateError } = await supabaseAdmin
                .from('wine_pairings')
                .update({
                    wine_id: targetWineId,
                    note: item.note
                })
                .eq('id', item.id);

            if (updateError) {
                console.error(`❌ Failed to update pairing ${item.id}:`, updateError.message);
            } else {
                restoredCount++;
            }
        }
    }

    console.log(`✅ Restoration Complete.`);
    console.log(`   - Restored/Linked Pairings: ${restoredCount}`);
    console.log(`   - New Wines Created: ${createdWineCount}`);
}

restore().catch(console.error);
