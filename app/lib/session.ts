'use client';

import { RestaurantData } from '@/types/menu';

const SESSION_KEY = 'palate_sommelier_session';

export interface SessionData {
    tenantId: string;
    restaurantName: string;
    menuData: RestaurantData;
}

export const saveSession = (data: SessionData) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    }
};

export const getSession = (): SessionData | null => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(SESSION_KEY);
        if (stored) {
            try {
                const session = JSON.parse(stored);
                // Validate structure: menuData must have a 'menu' array
                if (session && session.menuData && Array.isArray(session.menuData.menu)) {
                    return session;
                }
                // If data is invalid (e.g. old structure), clear it to prevent crashes
                console.warn("Invalid session structure detected, clearing session.");
                localStorage.removeItem(SESSION_KEY);
                return null;
            } catch (e) {
                console.error("Failed to parse session", e);
                return null;
            }
        }
    }
    return null;
};

export const clearSession = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(SESSION_KEY);
    }
};
