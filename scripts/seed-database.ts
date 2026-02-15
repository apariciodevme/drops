
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv'; // We might need dotenv to load from .env.local for the script

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DATA_DIR = path.join(process.cwd(), 'data');
const TENANTS_FILE = path.join(DATA_DIR, 'tenants.json');
const MENUS_DIR = path.join(DATA_DIR, 'menus');

async function seedDatabase() {
    try {
        console.log('Reading tenants.json...');
        const tenantsContent = fs.readFileSync(TENANTS_FILE, 'utf-8');
        const tenants = JSON.parse(tenantsContent);

        for (const tenant of tenants) {
            console.log(`Processing tenant: ${tenant.name} (${tenant.id})`);

            const menuPath = path.join(MENUS_DIR, `${tenant.id}.json`);
            let menuData = [];

            if (fs.existsSync(menuPath)) {
                const menuContent = fs.readFileSync(menuPath, 'utf-8');
                const parsedMenu = JSON.parse(menuContent);
                // Ensure we extract just the menu array if the file wrapper is RestaurantData
                menuData = parsedMenu.menu || [];
            } else {
                console.warn(`  Warning: Menu file not found for ${tenant.id}`);
            }

            const { error } = await supabase
                .from('tenants')
                .upsert({
                    id: tenant.id,
                    name: tenant.name,
                    access_code: tenant.accessCode, // Map accessCode to access_code
                    theme: tenant.theme,
                    menu: menuData
                }, { onConflict: 'id' });

            if (error) {
                console.error(`  Error upserting tenant ${tenant.id}:`, error.message);
            } else {
                console.log(`  Successfully synced ${tenant.id}`);
            }
        }

        console.log('Database seeding completed!');
    } catch (error) {
        console.error('Seeding failed:', error);
    }
}

seedDatabase();
