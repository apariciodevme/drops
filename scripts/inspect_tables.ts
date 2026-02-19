
import { config } from 'dotenv';
import path from 'path';

// Load Env Vars FIRST
const envLocalPath = path.resolve(process.cwd(), '.env.local');
let result = config({ path: '.env.local' });
if (result.error) result = config({ path: '.env' });

async function inspectTables() {
    // Dynamic import
    const { supabaseAdmin } = await import('@/app/lib/supabase-admin');

    console.log("Inspecting columns...");

    // Fetch one row from menu_items
    const { data: menuItems } = await supabaseAdmin.from('menu_items').select('*').limit(1);
    console.log("menu_items columns:", menuItems && menuItems.length > 0 ? Object.keys(menuItems[0]) : "Empty table or no rows");

    // If empty, try select count to at least confirm table exists, or try inserting dummy to fail
    if (!menuItems || menuItems.length === 0) {
        console.log("menu_items table exists (query ran), but is empty.");
    }

    // Fetch one row from dishes
    const { data: dishes } = await supabaseAdmin.from('dishes').select('*').limit(1);
    console.log("dishes columns:", dishes && dishes.length > 0 ? Object.keys(dishes[0]) : "Empty table or no rows");
}

inspectTables();
