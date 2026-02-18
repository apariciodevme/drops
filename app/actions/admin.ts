'use server';

import { supabase } from '@/app/lib/supabase';
import { RestaurantData, RestaurantDataSchema } from '@/types/menu';
import { revalidateTag } from 'next/cache';

export async function updateMenu(tenantId: string, data: RestaurantData) {
    if (!tenantId) {
        return { error: 'Tenant ID is required.' };
    }

    // Validate data against schema
    const validation = RestaurantDataSchema.safeParse(data);
    if (!validation.success) {
        console.error('Validation error:', validation.error);
        return { error: 'Invalid data format: ' + validation.error.issues.map(i => i.message).join(', ') };
    }

    try {
        console.log(`[Admin] Starting sequential update for tenant: ${tenantId}`);

        // 1. Delete existing structure (Cascade will remove items and pairings)
        const { error: deleteError } = await supabase
            .from('categories')
            .delete()
            .eq('tenant_id', tenantId);

        if (deleteError) {
            console.error('[Admin] Delete error:', deleteError);
            throw new Error('Failed to clear old menu data.');
        }

        // 2. Re-insert full tree (Sequential / Iterative)
        for (let catIndex = 0; catIndex < validation.data.menu.length; catIndex++) {
            const category = validation.data.menu[catIndex];

            const { data: catRecord, error: catError } = await supabase
                .from('categories')
                .insert({
                    tenant_id: tenantId,
                    name: category.category,
                    sort_order: catIndex
                })
                .select()
                .single();

            if (catError || !catRecord) throw new Error('Failed to insert category: ' + catError?.message);

            for (let itemIndex = 0; itemIndex < category.items.length; itemIndex++) {
                const item = category.items[itemIndex];

                const { data: itemRecord, error: itemError } = await supabase
                    .from('menu_items')
                    .insert({
                        category_id: catRecord.id,
                        dish: item.dish,
                        price: item.price.toString(),
                        sort_order: itemIndex
                    })
                    .select()
                    .single();

                if (itemError || !itemRecord) throw new Error('Failed to insert item: ' + itemError?.message);

                const tiers = ['byGlass', 'midRange', 'exclusive'] as const;
                const pairingsToInsert = tiers.map(tier => ({
                    menu_item_id: itemRecord.id,
                    tier: tier,
                    ...item.pairings[tier],
                    description: item.pairings[tier].description || null,
                    keywords: item.pairings[tier].keywords || []
                }));

                const { error: pairError } = await supabase
                    .from('wine_pairings')
                    .insert(pairingsToInsert);

                if (pairError) throw new Error('Failed to insert pairings: ' + pairError.message);
            }
        }

        console.log('[Admin] Sequential update successful.');

        // Keep the cache clearing!
        // Next.js 16 requires a profile argument
        revalidateTag('menu', 'default');

        return { success: true };
    } catch (error: any) {
        console.error('Update menu error:', error);
        return { error: error.message || 'Failed to update menu.' };
    }
}
