# Codebase Restructuring Plan

## Current Issues Identified

### 1. Circular Dependencies

- **Product** interface defined in multiple files:
  - `components/ProductCard.tsx` (line 6)
  - `components/MostRecommended.tsx` (line 8)
  - `components/YouMayAlsoLike.tsx` (line 6)
- This creates circular import dependencies when data files reference the interface

### 2. Poor Component Organization

Current flat structure in `/components`:

- 18 components all at root level
- No logical grouping (UI vs Feature vs Layout)
- Difficult to maintain and scale

### 3. Mixed Component Types

- **UI Components**: Button, basic UI elements
- **Feature Components**: ProductCard, forms, specific functionality
- **Layout Components**: NavBar, Footer, Hero
- **Page Components**: Should be in `/pages` directory

### 4. Inconsistent Patterns

- Some components use 'use client' unnecessarily
- Import paths inconsistent
- Type definitions scattered

## Proposed New Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (layout)/
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Home page
│   ├── products/
│   │   ├── page.tsx        # All products
│   │   └── [id]/
│   │       └── page.tsx    # Product detail
│   └── contact-us/
│       └── page.tsx        # Contact page
├── components/             # Component library
│   ├── ui/                # Base UI components
│   │   ├── button.tsx
│   │   └── sort-dropdown.tsx
│   ├── layout/            # Layout components
│   │   ├── navbar.tsx
│   │   ├── footer.tsx
│   │   └── hero.tsx
│   ├── features/          # Feature-specific components
│   │   ├── products/
│   │   │   ├── product-card.tsx
│   │   │   ├── product-hero.tsx
│   │   │   ├── product-details.tsx
│   │   │   └── product-info.tsx
│   │   ├── carousel/
│   │   │   └── spotlight-carousel.tsx
│   │   └── forms/
│   │       └── contact-form.tsx
│   └── sections/          # Page sections
│       ├── about.tsx
│       ├── categories.tsx
│       ├── explore.tsx
│       ├── most-recommended.tsx
│       ├── testimonials.tsx
│       └── you-may-also-like.tsx
├── lib/                   # Utilities and data
│   ├── data/
│   │   └── mock-products.ts
│   ├── hooks/
│   │   └── use-media.ts
│   └── utils.ts
├── types/                 # TypeScript type definitions
│   └── index.ts
└── styles/
    └── globals.css
```

## Implementation Steps

### 1. Create Type Definitions

- Create `types/index.ts` with centralized interfaces
- Export Product, FilterState, PriceRange, SortOption types

### 2. Reorganize Directory Structure

- Create new directory structure
- Move components to appropriate subdirectories
- Update imports in all files

### 3. Fix Import Statements

- Update all import paths to match new structure
- Remove circular dependencies
- Standardize import patterns

### 4. Component Separation

- Extract Product interface to types
- Separate UI, layout, and feature components
- Create proper component hierarchy

### 5. Validation

- Test all pages load correctly
- Verify no broken imports
- Ensure all functionality works

## Benefits of New Structure

1. **Clear Separation of Concerns**
2. **Better Scalability**
3. **Easier Maintenance**
4. **Consistent Import Patterns**
5. **Eliminated Circular Dependencies**
6. **Better Developer Experience**
