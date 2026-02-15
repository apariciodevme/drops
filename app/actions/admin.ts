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
        const { error } = await supabase
            .from('tenants')
            .update({ menu: validation.data.menu })
            .eq('id', tenantId);

        if (error) {
            console.error('Supabase update error:', error);
            return { error: 'Failed to update menu in database.' };
        }

        return { success: true };
    } catch (error) {
        console.error('Update menu error:', error);
        return { error: 'Failed to update menu.' };
    }
}
