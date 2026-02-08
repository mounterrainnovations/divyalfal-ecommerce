# Hopeworks Divyafal Codebase Context

## Overview
- Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4.
- Runtime shape: serverless-style APIs under `app/api/*` with Prisma + Supabase storage usage.
- Domain: ecommerce storefront + admin dashboard for product management.

## Main Areas
- `app/`: routes, page layouts, and API route handlers.
- `components/`: UI sections, product features, layout pieces, and reusable primitives.
- `lib/`: auth utilities, Prisma client setup, DB retry helper, and product transformation helpers.
- `prisma/`: schema and migrations for product data.
- `types/`: shared frontend/backend product types.

## Data Flow
- Public listing pages fetch from `/api/products` and `/api/homepage-sections`.
- API handlers query Prisma models, then normalize DB output via `lib/utils/product-utils.ts`.
- Dashboard/admin pages mutate products via `/api/products` and `/api/products/[id]`.

## Current Cleanup Notes (this branch)
- Removed route-local duplicated DB retry implementations and standardized on:
  `lib/utils/database.ts`.
- Replaced fragile `next/font/google` runtime fetch dependency with local CSS font stacks to keep builds deterministic in restricted/offline environments.
- Fixed strict lint violations by replacing `any` in homepage sections with typed response interfaces.
- Reduced duplicated routing surface by making `/virasath-academy` redirect to canonical `/virasat-academy`.
- Removed unused duplicate component file: `components/sections/virasath-academy.tsx`.

## Validation Checklist
- `npm run lint`
- `npm run build`
