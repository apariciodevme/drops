import { Wine, Tag } from '@/app/actions/inventory';

export interface ScoredWine extends Wine {
    score: number;
    matchReasons: string[];
}

export function calculateMatches(dishTags: string[], wines: Wine[], allTags: Tag[]): ScoredWine[] {
    if (!dishTags || dishTags.length === 0) return [];

    const scored = wines.map(wine => {
        let score = 0;
        const matchReasons: string[] = [];

        // Check stock
        if (wine.stock_status === 'out_of_stock') {
            return { ...wine, score: -1, matchReasons: [] };
        }

        if (wine.tags) {
            wine.tags.forEach(wineTag => {
                if (dishTags.includes(wineTag.tag_id)) {
                    score += (wineTag.weight || 5);
                    const tagName = allTags.find(t => t.id === wineTag.tag_id)?.name;
                    if (tagName) matchReasons.push(tagName);
                }
            });
        }

        return { ...wine, score, matchReasons };
    }).filter(w => w.score > 0);

    return scored.sort((a, b) => b.score - a.score);
}

export function bucketWines(wines: ScoredWine[]) {
    // Simple heuristic for now. Can be configured per tenant later.
    // By Glass: < 20
    // Mid: 20 - 60
    // Exclusive: > 60

    const byGlass = wines.filter(w => w.price < 25);
    const midRange = wines.filter(w => w.price >= 25 && w.price < 65);
    const exclusive = wines.filter(w => w.price >= 65);

    // Sort each bucket by score
    byGlass.sort((a, b) => b.score - a.score);
    midRange.sort((a, b) => b.score - a.score);
    exclusive.sort((a, b) => b.score - a.score);

    return { byGlass, midRange, exclusive };
}
