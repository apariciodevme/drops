'use server';

import { supabaseAdmin } from '@/app/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export interface Tag {
    id: string;
    name: string;
    category: string;
}

export interface Wine {
    id?: string;
    tenant_id: string;
    name: string;
    grape: string;
    vintage: string;
    price: number;
    description: string;
    stock_status: 'in_stock' | 'out_of_stock';
    tags: { tag_id: string; weight: number }[];
}

export async function getTags() {
    const { data, error } = await supabaseAdmin
        .from('tags')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching tags:', error);
        return [];
    }
    return data as Tag[];
}

export async function getWines(tenantId: string) {
    // Fetch wines
    const { data: wines, error: winesError } = await supabaseAdmin
        .from('wines')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');

    if (winesError) {
        console.error('Error fetching wines:', winesError);
        return [];
    }

    // Fetch tags for these wines
    const wineIds = wines.map(w => w.id);
    const { data: wineTags, error: tagsError } = await supabaseAdmin
        .from('wine_tags')
        .select('wine_id, tag_id, weight')
        .in('wine_id', wineIds);

    if (tagsError) {
        console.error('Error fetching wine tags:', tagsError);
        return [];
    }

    // Combine
    return wines.map(wine => ({
        ...wine,
        tags: wineTags.filter((wt: any) => wt.wine_id === wine.id)
    })) as Wine[];
}

export async function saveWine(wine: Wine) {
    // 1. Upsert Wine
    const { data: savedWine, error: wineError } = await supabaseAdmin
        .from('wines')
        .upsert({
            id: wine.id, // Only use if present, otherwise DB generates? No, upsert needs PK match.
            // If id is undefined, upsert will try to insert. If it relies on default UUID, we might need to handle it.
            // For a new wine, id is undefined. Supabase (Postgres) needs to generate it.
            // Upsert works best if we provide the ID or leave it out completely for INSERT.
            // If wine.id is undefined, we should probably OMIT it from the upsert payload entirely totrigger default gen.
            // Let's refine the payload.
            ...((wine.id) ? { id: wine.id } : {}),
            tenant_id: wine.tenant_id,
            name: wine.name,
            grape: wine.grape,
            vintage: wine.vintage,
            price: wine.price,
            description: wine.description,
            stock_status: wine.stock_status
        } as any)
        .select()
        .single();

    if (wineError) {
        return { success: false, error: wineError.message };
    }

    const wineId = savedWine.id;

    // 2. Update Tags
    // First, remove existing tags for this wine
    await supabaseAdmin.from('wine_tags').delete().eq('wine_id', wineId);

    // Then insert new ones
    if (wine.tags && wine.tags.length > 0) {
        const { error: tagError } = await supabaseAdmin
            .from('wine_tags')
            .insert(wine.tags.map(t => ({
                wine_id: wineId,
                tag_id: t.tag_id,
                weight: t.weight
            })));

        if (tagError) {
            return { success: false, error: tagError.message };
        }
    }

    revalidatePath('/admin');
    return { success: true, data: savedWine };
}

export async function deleteWine(wineId: string) {
    const { error } = await supabaseAdmin.from('wines').delete().eq('id', wineId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    return { success: true };
}
