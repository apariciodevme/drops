'use server';

import { supabase } from '@/app/lib/supabase';
import { RestaurantData } from '@/types/menu';

export async function authenticateAndLoad(code: string) {
    if (!code) {
        return { error: 'Please enter an access code.' };
    }

    try {
        // 1. Fetch Tenant
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .eq('access_code', code)
            .single();

        if (tenantError || !tenant) {
            return { error: 'Invalid access code.' };
        }

        // 2. Fetch Relational Menu Data
        // Doing strict ordered fetching is easier with separate queries or ordering in app
        // But let's try a nested fetch sorted by sort_order
        const { data: categories, error: menuError } = await supabase
            .from('categories')
            .select(`
                name,
                sort_order,
                menu_items (
                    dish,
                    price,
                    sort_order,
                    wine_pairings (
                        tier,
                        name,
                        vintage,
                        grape,
                        price,
                        note,
                        keywords
                    )
                )
            `)
            .eq('tenant_id', tenant.id)
            .order('sort_order', { ascending: true });

        if (menuError) {
            console.error('Menu fetch error:', menuError);
            return { error: 'Failed to load menu.' };
        }

        // 3. Transform to RestaurantData structure
        const menu = categories.map((cat: any) => ({
            category: cat.name,
            items: (cat.menu_items || [])
                .sort((a: any, b: any) => a.sort_order - b.sort_order)
                .map((item: any) => {
                    // Reconstruct pairings object
                    const pairings: any = {
                        byGlass: {},
                        midRange: {},
                        exclusive: {}
                    };

                    if (item.wine_pairings) {
                        item.wine_pairings.forEach((p: any) => {
                            if (pairings[p.tier] !== undefined) {
                                pairings[p.tier] = {
                                    name: p.name,
                                    vintage: p.vintage,
                                    grape: p.grape,
                                    price: p.price,
                                    note: p.note,
                                    keywords: p.keywords
                                };
                            }
                        });
                    }

                    return {
                        dish: item.dish,
                        price: item.price,
                        pairings: pairings
                    };
                })
        }));

        const restaurantData: RestaurantData = {
            restaurantName: tenant.name,
            menu: menu
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
