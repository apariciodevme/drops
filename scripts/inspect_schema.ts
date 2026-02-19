
import { config } from 'dotenv';
import path from 'path';

// Load Env Vars FIRST
const envLocalPath = path.resolve(process.cwd(), '.env.local');
let result = config({ path: '.env.local' });
if (result.error) result = config({ path: '.env' });

async function inspect() {
    // Dynamic import
    const { supabaseAdmin } = await import('@/app/lib/supabase-admin');

    console.log("Inspecting dish_tags constraints...");

    // Attempt to insert a bad row to get error detail
    const { error } = await supabaseAdmin
        .from('dish_tags')
        .insert({ dish_id: '00000000-0000-0000-0000-000000000000', tag_id: '00000000-0000-0000-0000-000000000000', weight: 1 });

    if (error) {
        console.log("Insert Error:", error.message);
        // Supabase-js might not expose details/hint in the error object directly in all versions, but let's try
        console.log("Details:", (error as any).details);
        console.log("Hint:", (error as any).hint);
    }

    // Check if 'dishes' table exists
    const { error: dishError } = await supabaseAdmin.from('dishes').select('*').limit(1);
    console.log("Dishes table exists?", !dishError);

    // Check if 'menu_items' table exists
    const { error: menuError } = await supabaseAdmin.from('menu_items').select('*').limit(1);
    console.log("Menu Items table exists?", !menuError);
}

inspect();
