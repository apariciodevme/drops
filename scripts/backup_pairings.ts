
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabaseAdmin } from '../app/lib/supabase-admin';
import fs from 'fs';
import path from 'path';

async function backup() {
    console.log('📦 Starting backup of wine_pairings...');

    // Fetch all pairings
    const { data, error } = await supabaseAdmin
        .from('wine_pairings')
        .select('*');

    if (error) {
        console.error('❌ Backup failed:', error);
        process.exit(1);
    }

    if (!data || data.length === 0) {
        console.warn('⚠️ No data found to backup.');
        return;
    }

    // Create backup dir if not exists
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }

    // Write to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `wine_pairings_backup_${timestamp}.json`;
    const filepath = path.join(backupDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

    console.log(`✅ Backup successful! Saved ${data.length} records to:`);
    console.log(filepath);
}

backup();
