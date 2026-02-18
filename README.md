# Drops Sommelier App

**Drops.** is an intelligent, digital sommelier application designed for high-end restaurants. It replaces static pairing lists with a dynamic recommendation engine, allowing for real-time inventory management and algorithmic wine pairings based on flavor profiles.

## Core Features

-   **Dynamic Pairing Engine**: Algorithms match wines to dishes based on standard flavor tags (e.g., "Acidic", "Rich", "Spicy").
-   **Multi-Tenant Architecture**: Supports multiple restaurants (e.g., Palate, Pastis) via a single codebase, managed by Supabase.
-   **Admin Dashboard**: comprehensive inventory and menu management system.
-   **Sommelier Interface**: A sleek, guest-facing or staff-facing UI for exploring pairings by price tier (Glass, Mid-Range, Exclusive).

## Tech Stack

-   **Framework**: Next.js 14+ (App Router)
-   **Database**: Supabase (PostgreSQL)
-   **Styling**: Tailwind CSS, Framer Motion
-   **State/Cache**: Server Actions, `unstable_cache` for performance.

## Getting Started

1.  **Environment Setup**:
    Ensure you have a `.env.local` file with:
    ```bash
    NEXT_PUBLIC_SUPABASE_URL=...
    NEXT_PUBLIC_SUPABASE_ANON_KEY=...
    SUPABASE_SERVICE_ROLE_KEY=...
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```

3.  **Access**:
    -   **App**: Visit `http://localhost:3000` and enter a tenant access code (e.g., `1234` for Palate).
    -   **Admin**: Visit `http://localhost:3000/admin` (auto-redirects to login if not authenticated).

## Architecture

-   **Data Source**: All data (Tenants, Menus, Wines, Pairings) is stored in Supabase.
-   **Legacy Data**: Previous JSON-based data storage (`data/`) has been deprecated in favor of the relational database model.
-   **Configuration**: Global constants are maintained in `app/lib/constants.ts`.

## Deployment

Deployed on Vercel. Ensure environment variables are synchronized in the Vercel dashboard.
