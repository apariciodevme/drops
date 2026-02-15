'use server';

import { supabase } from '@/app/lib/supabase';
import { RestaurantData } from '@/types/menu';

export async function authenticateAndLoad(code: string) {
    if (!code) {
        return { error: 'Please enter an access code.' };
    }

    try {
        const { data: tenant, error } = await supabase
            .from('tenants')
            .select('*')
            .eq('access_code', code)
            .single();

        if (error || !tenant) {
            return { error: 'Invalid access code.' };
        }

        // Return the actual data structure
        const restaurantData: RestaurantData = {
            restaurantName: tenant.name,
            menu: tenant.menu as any // Casting as any because specific array type check might be complex at runtime, but structure is validated
        };

        return {
            success: true,
            tenantId: tenant.id,
            restaurantName: tenant.name,
            data: restaurantData,
            theme: tenant.theme
        };

    } catch (error) {
        console.error('Auth error:', error);
        return { error: 'An unexpected error occurred.' };
    }
}
