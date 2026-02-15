import { z } from 'zod';

export const WinePairingSchema = z.object({
    name: z.string(),
    vintage: z.string(),
    price: z.string(),
    note: z.string(),
    grape: z.string()
});

export const PairingsSchema = z.object({
    byGlass: WinePairingSchema,
    midRange: WinePairingSchema,
    exclusive: WinePairingSchema
});

export const MenuItemSchema = z.object({
    dish: z.string(),
    price: z.union([z.number(), z.string()]),
    pairings: PairingsSchema
});

export const MenuCategorySchema = z.object({
    category: z.string(),
    items: z.array(MenuItemSchema)
});

export const RestaurantDataSchema = z.object({
    restaurantName: z.string(),
    menu: z.array(MenuCategorySchema)
});

export type WinePairing = z.infer<typeof WinePairingSchema>;
export type Pairings = z.infer<typeof PairingsSchema>;
export type MenuItem = z.infer<typeof MenuItemSchema>;
export type MenuCategory = z.infer<typeof MenuCategorySchema>;
export type RestaurantData = z.infer<typeof RestaurantDataSchema>;