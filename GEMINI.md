# GEMINI.md

## Project Context
**Divyafal** is a boutique e-commerce application specializing in traditional Indian clothing, built with Next.js 16 (App Router), Prisma, and Tailwind CSS 4.0.

## Tech Stack
- **Framework:** Next.js 16.0.7 (React 19)
- **Database:** Prisma 6.18.0 with PostgreSQL (Supabase)
- **Styling:** Tailwind CSS 4.0, Lucide icons
- **State:** Zustand 5.0.8, TanStack Query 5.90.5
- **Assets:** Supabase storage for images

## Key Conventions
- **Routing:** App Router (`app/`).
- **Components:** Functional components with TypeScript.
- **UI:** Shadcn-based components in `components/ui/`.
- **Database:** Prisma client singleton in `lib/db.ts`.
- **API:** Standardized REST endpoints in `app/api/`.
- **Data:** DbProducts (from Prisma) are transformed to frontend `Product` interfaces via `lib/utils/product-utils.ts`.

## Critical Knowledge
- **Production Fixes:**
  - Product detail pages (`/product/[id]`) use `force-dynamic` to ensure compatibility with Vercel's serverless environment and prevent build-time database connection issues.
  - Prisma client tracing must be configured in `next.config.ts` and `vercel.json` for all routes using Prisma (both API and App routes).
- **Naming:** "Virasat Academy" is the correct spelling for the academy section/page.
- **Images:** Most recommended images are located in `public/mostrec/`.
- **Security:** Do not commit `cookies.txt` or other sensitive tokens.

## Common Workflows
- **New Product Category:** Update `Prisma` schema, run `prisma generate`, and update `lib/common/product-interfaces.ts`.
- **Component Styling:** Use Vanilla CSS or Tailwind CSS 4.0 utility classes.
- **Mock Data:** Use `lib/data/mock-products.ts` for fallback/development data.
