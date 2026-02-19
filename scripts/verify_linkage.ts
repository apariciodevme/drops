
import { config } from 'dotenv';
import path from 'path';

// Load Env Vars FIRST
console.log("Current working directory:", process.cwd());
config({ path: '.env.local' });

async function verifyLinkage() {
    // Dynamic import to ensure env vars are loaded first
    const { supabaseAdmin } = await import('@/app/lib/supabase-admin');

    // 1. Get Palate Tenant Access Code
    const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('*')
        .eq('id', 'palate')
        .single();

    if (!tenant) {
        console.error("Palate tenant not found!");
        return;
    }

    console.log(`Tenant: ${tenant.name} (Code: ${tenant.access_code})`);

    // 2. Perform the JOIN query manually to simulate auth.ts (avoiding next/cache issues in script)
    // We want to verify that fetching menu also fetches wines
    console.log("Fetching menu with JOIN...");

    const { data: categories, error } = await supabaseAdmin
        .from('categories')
        .select(`
            name,
            menu_items (
                dish,
                wine_pairings (
                    name,
                    description,
                    wines (
                        id,
                        name,
                        description
                    )
                )
            )
        `)
        .eq('tenant_id', 'palate')
        .limit(1);

    if (error) {
        console.error("Error with JOIN query:", error);
        return;
    }

    // Find a pairing with a linked wine
    let targetWineId: string | null = null;
    let targetPairingId: string | null = null;
    let originalDescription: string | null = null;

    // Traverse to find a valid wine
    for (const cat of categories) {
        for (const item of cat.menu_items) {
            for (const p of item.wine_pairings) {
                if (p.wines) {
                    targetWineId = p.wines.id;
                    originalDescription = p.wines.description;
                    console.log(`Found linked wine: ${p.wines.name} (Desc: ${p.wines.description})`);
                    break;
                }
            }
            if (targetWineId) break;
        }
        if (targetWineId) break;
    }

    if (!targetWineId) {
        console.error("No linked wines found! Linkage might have failed.");
        return;
    }

    // 3. Update the WINE in the Inventory
    const TEST_DESC = `VERIFIED_UPDATE_${Date.now()}`;
    console.log(`Updating wine ${targetWineId} description to: ${TEST_DESC}`);

    const { error: updateError } = await supabaseAdmin
        .from('wines')
        .update({ description: TEST_DESC })
        .eq('id', targetWineId);

    if (updateError) {
        console.error("Update failed:", updateError);
        return;
    }

    // 4. Re-fetch and verify
    console.log("Re-fetching menu to verify propagation...");
    const { data: updatedCategories } = await supabaseAdmin
        .from('categories')
        .select(`
            menu_items (
                wine_pairings (
                    wines (
                        description
                    )
                )
            )
        `)
        .eq('tenant_id', 'palate');

    let verified = false;
    // Check if any returned pairing has the new description
    outerLoop:
    for (const cat of updatedCategories as any) {
        for (const item of cat.menu_items) {
            for (const p of item.wine_pairings) {
                if (p.wines && p.wines.description === TEST_DESC) {
                    verified = true;
                    console.log("✅ SUCCESS! Menu reflects the updated inventory description.");
                    break outerLoop;
                }
            }
        }
    }

    if (!verified) {
        console.error("❌ FAILURE! Menu did not show the updated description.");
    }

    // 5. Cleanup
    console.log("Restoring original description...");
    await supabaseAdmin
        .from('wines')
        .update({ description: originalDescription })
        .eq('id', targetWineId);

    console.log("Cleanup complete.");
}

verifyLinkage().catch(console.error);
