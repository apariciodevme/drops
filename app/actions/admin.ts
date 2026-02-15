'use server';

import { supabase } from '@/app/lib/supabase';
import { RestaurantData, RestaurantDataSchema } from '@/types/menu';

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
        console.log(`[Admin] Updating menu for tenant: ${tenantId}, Menu items: ${validation.data.menu.length}`);

        const { data: updatedData, error } = await supabase
            .from('tenants')
            .update({ menu: validation.data.menu })
            .eq('id', tenantId)
            .select();

        if (error) {
            console.error('[Admin] Supabase update error:', error);
            return { error: 'Failed to update menu in database: ' + error.message };
        }

        if (!updatedData || updatedData.length === 0) {
            console.error('[Admin] No rows updated. Check Tenant ID or RLS policies.');
            return { error: 'No changes saved. Access denied or Tenant not found.' };
        }

        console.log('[Admin] Update successful. Rows affected:', updatedData.length);
        return { success: true };

        return { success: true };
    } catch (error) {
        console.error('Update menu error:', error);
        return { error: 'Failed to update menu.' };
    }
}
