'use server';

import { getWines, getTags } from './inventory';
import { calculateMatches, bucketWines } from '@/app/lib/pairing-engine';

export async function generatePairings(dishTags: string[], tenantId: string) {
    if (!dishTags || dishTags.length === 0) {
        return { error: 'No tags provided for the dish.' };
    }

    const [wines, tags] = await Promise.all([
        getWines(tenantId),
        getTags()
    ]);

    const scored = calculateMatches(dishTags, wines, tags);
    const buckets = bucketWines(scored);

    // Return the top 1 for each category, or null if none
    return {
        byGlass: buckets.byGlass[0] || null,
        midRange: buckets.midRange[0] || null,
        exclusive: buckets.exclusive[0] || null
    };
}
