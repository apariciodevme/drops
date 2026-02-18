'use server';

import { supabaseAdmin } from '@/app/lib/supabase-admin';
import { RestaurantData, RestaurantDataSchema, Pairings } from '@/types/menu';
import { unstable_cache } from 'next/cache';

// Database response interfaces
interface DBWinePairing {
    tier: 'byGlass' | 'midRange' | 'exclusive';
    name: string;
    vintage: string;
    grape: string;
    price: string;
    note: string;
    keywords: string[] | null;
}

interface DBMenuItem {
    dish: string;
    price: string;
    sort_order: number;
    wine_pairings: DBWinePairing[];
}

interface DBCategory {
    name: string;
    sort_order: number;
    menu_items: DBMenuItem[];
}

// Cached menu fetcher
const getCachedMenu = unstable_cache(
    async (tenantId: string) => {
        const { data: categories, error } = await supabaseAdmin
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
            .eq('tenant_id', tenantId)
            //.order('sort_order', { ascending: true }); // Remove if causing issues, but here it's SELECT not INSERT
            .order('sort_order', { ascending: true });

        if (error) throw error;
        return categories as unknown as DBCategory[];
    },
    ['menu-data'],
    { tags: ['menu'] }
);

export async function authenticateAndLoad(code: string) {
    if (!code) {
        return { error: 'Please enter an access code.' };
    }

    try {
        // 1. Fetch Tenant (Admin Bypass)
        const { data: tenant, error: tenantError } = await supabaseAdmin
            .from('tenants')
            .select('*')
            .eq('access_code', code)
            .single();

        if (tenantError || !tenant) {
            return { error: 'Invalid access code.' };
        }

        // 2. Fetch Relational Menu Data (Cached)
        let categories: DBCategory[];
        try {
            categories = await getCachedMenu(tenant.id);
        } catch (menuError) {
            console.error('Menu fetch error:', menuError);
            return { error: 'Failed to load menu.' };
        }

        // 3. Transform to RestaurantData structure
        const menu = categories.map((cat) => ({
            category: cat.name,
            items: (cat.menu_items || [])
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((item) => {
                    // Reconstruct pairings object
                    const pairings: Pairings = {
                        byGlass: { name: '', grape: '', vintage: '', price: '', note: '', keywords: [] },
                        midRange: { name: '', grape: '', vintage: '', price: '', note: '', keywords: [] },
                        exclusive: { name: '', grape: '', vintage: '', price: '', note: '', keywords: [] }
                    };

                    if (item.wine_pairings) {
                        item.wine_pairings.forEach((p) => {
                            if (pairings[p.tier]) {
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
