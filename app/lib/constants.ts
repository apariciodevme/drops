
export const APP_NAME = "Drops.";
export const APP_TAGLINE = "Your personal sommelier.";

export const TIERS = {
    byGlass: "By the Glass",
    midRange: "Mid-Range",
    exclusive: "Exclusive"
} as const;

export const TIER_KEYS = ['byGlass', 'midRange', 'exclusive'] as const;

export const DEFAULT_CURRENCY = "NOK";

export const ERROR_MESSAGES = {
    GENERIC: "An unexpected error occurred.",
    LOGIN_INVALID: "Invalid access code.",
    LOGIN_REQUIRED: "Please enter an access code.",
    MENU_LOAD_FAILED: "Failed to load menu."
};
