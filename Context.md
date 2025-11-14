# Divyafal E-commerce Application - Comprehensive Context

## Project Overview

**Divyafal** is a modern e-commerce application built with Next.js for a boutique specializing in traditional Indian clothing. The application features a responsive design, comprehensive product catalog, and sophisticated filtering capabilities.

## Technology Stack

### Core Framework

- **Next.js 16.0.0** - React-based full-stack framework
- **React 19.2.0** - Frontend library
- **TypeScript** - Type-safe JavaScript development

### Database & ORM

- **Prisma ORM 6.18.0** - Database ORM with PostgreSQL
- **PostgreSQL** - Primary database

### UI/UX & Styling

- **Tailwind CSS 4.0** - Utility-first CSS framework
- **shadcn/ui** - Component library
- **Lucide React** - Icon library
- **Radix UI** - Accessible component primitives

### State Management & Data Fetching

- **Zustand 5.0.8** - Lightweight state management
- **TanStack React Query 5.90.5** - Server state management
- **Supabase** - Backend-as-a-Service for storage

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **PostCSS** - CSS processing

## Project Structure

```
divyafal/
├── app/                          # Next.js App Router
│   ├── api/                     # API Routes
│   │   ├── health/              # Health check endpoint
│   │   ├── products/            # Product CRUD operations
│   │   │   ├── route.ts         # GET/POST products
│   │   │   └── [id]/            # Single product operations
│   │   │       └── route.ts     # GET/PATCH/DELETE product
│   │   ├── contact-us/          # Contact page
│   │   ├── layout.tsx           # Root layout component
│   │   ├── page.tsx             # Homepage
│   │   ├── products/            # Products catalog page
│   │   └── product/[id]/        # Individual product page
├── components/                   # React Components
│   ├── features/                # Feature-specific components
│   │   ├── carousel/            # Product carousels
│   │   ├── forms/               # Form components
│   │   └── products/            # Product-related components
│   ├── layout/                  # Layout components
│   ├── sections/                # Page sections
│   └── ui/                      # Reusable UI components
├── lib/                         # Utility libraries
│   ├── common/                  # Shared utilities and interfaces
│   ├── data/                    # Static data and configurations
│   ├── hooks/                   # Custom React hooks
│   ├── utils/                   # Utility functions
│   └── db.ts                    # Database connection
├── prisma/                      # Database schema and migrations
├── public/                      # Static assets
├── types/                       # TypeScript type definitions
└── Configuration files
```

## Database Schema

### Product Model

```prisma
model Product {
  id             String      @id @default(uuid())
  name           String      @db.VarChar(255)
  photos         String[]    # Array of image URLs
  price          Decimal     @db.Decimal(10, 2)
  specifications String
  category       ProductType @default(OTHER)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
}
```

### Product Categories

- **SAREE** - Traditional sarees
- **INDO_WESTERN** - Indo-western fusion wear
- **LEHENGA** - Lehenga cholis
- **SUIT** - Suit sets
- **KURTA_PANT** - Kurta pant sets
- **WESTERN** - Western wear
- **OTHER** - Miscellaneous items

## Key Features

### 1. Homepage (`/`)

- **Hero Section** - Dynamic background (image/video based on device)
- **Categories** - Product category showcase
- **Spotlight Carousel** - Featured products
- **Most Recommended** - Popular items section
- **Shop by Style** - Style-based navigation
- **Testimonials** - Customer reviews
- **About** - Company information
- **Values** - Brand values section

### 2. Product Catalog (`/products`)

- **Advanced Filtering**
  - Search functionality
  - Category filters (multi-select)
  - Price range filters
  - Sort options (price, date, name)
- **Responsive Grid Layout**
- **Image Preloading** for better UX
- **Pagination** with API integration
- **Mobile-optimized** filter interface

### 3. Product Details (`/product/[id]`)

- **Product Hero** - Image gallery with navigation
- **Product Details** - Name, price, specifications
- **Related Products** - "You may also like" section
- **SEO Optimization** - Dynamic metadata generation

### 4. Contact Page (`/contact-us`)

- **Contact Form** - Customer inquiries
- **Hero Section** - Page introduction

## Data Flow Architecture

### Frontend Data Flow

1. **Client Component** → Search/Filter State
2. **API Call** → `/api/products` with parameters
3. **Server API Route** → Database Query via Prisma
4. **Database** → PostgreSQL with filtered results
5. **Transformation** → Database format → Frontend format
6. **Response** → JSON with products and metadata
7. **State Update** → Component re-render with new data

### Type Transformation

```typescript
// Database Product (DbProduct)
{
  id: string,
  name: string,
  photos: string[],
  price: Prisma.Decimal,
  specifications: string,
  category: ProductType,
  createdAt: Date,
  updatedAt: Date
}

// Frontend Product (Product)
{
  id: string,
  name: string,
  price: number,
  image: string, // First photo or fallback
  category: ProductCategory,
  specifications?: string
}
```

## API Endpoints

### Products API (`/api/products`)

- **GET** `/api/products` - List products with filtering
  - Query Parameters: `search`, `categories`, `minPrice`, `maxPrice`, `sortBy`, `page`, `limit`
  - Response: `{ products: Product[], total: number, page: number, limit: number, totalPages: number }`
- **POST** `/api/products` - Create new product
  - Body: Product creation data
  - Response: Created Product

### Product API (`/api/products/[id]`)

- **GET** `/api/products/[id]` - Get single product
  - Response: Product object
- **PATCH** `/api/products/[id]` - Update product
  - Body: Updated product data
  - Response: Updated Product
- **DELETE** `/api/products/[id]` - Delete product
  - Response: Success message

### Health Check (`/api/health`)

- **GET** `/api/health` - System health monitoring
  - Response: Database connection status, environment info

## Component Architecture

### Layout Components

- **Navbar** - Navigation with mobile menu
- **Footer** - Site footer with links
- **Hero** - Dynamic hero section (image/video)

### Feature Components

- **ProductCard** - Product display with image loading
- **ProductHero** - Product image gallery
- **ProductDetails** - Product information display
- **ContactForm** - Contact form with validation
- **SpotlightCarousel** - Featured products carousel

### UI Components

- **Button** - Variants: default, destructive, outline, secondary, ghost, link
- **SortDropdown** - Product sorting interface

## Custom Hooks

### `useImagePreloader`

```typescript
interface UseImagePreloaderOptions {
  urls: string[];
  maxConcurrent?: number;
}
```

- Preloads images in background
- Tracks loading progress
- Prevents UI blocking during image loads

### `useMedia`

- Media query hook for responsive behavior
- Used for hero section device-specific rendering

## State Management

### Client-Side State (Zustand)

- Filter states (search, categories, price range)
- UI states (mobile menu, loading)
- Cart management (planned feature)

### Server State (React Query)

- Product data fetching
- Caching and invalidation
- Background refetching

## Performance Optimizations

### Image Handling

- **Next.js Image Optimization** - Automatic image optimization
- **Lazy Loading** - Images load as needed
- **Preloading** - Critical images preloaded
- **Fallback Images** - Graceful error handling

### Data Fetching

- **API Debouncing** - 300ms debounce on search
- **Pagination** - Limit results per request
- **Caching** - React Query caching
- **Error Boundaries** - Graceful error handling

### Bundle Optimization

- **Code Splitting** - Automatic route-based splitting
- **Tree Shaking** - Unused code elimination
- **Asset Optimization** - Compressed images and assets

## Environment Configuration

### Required Environment Variables

```env
DATABASE_URL=postgresql://user:password@host:port/database
DIRECT_URL=postgresql://user:password@host:port/database
```

### Optional Environment Variables

```env
NODE_ENV=development|production
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Development Workflow

### Available Scripts

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run start` - Production server
- `npm run lint` - Code linting

### Development Tools

- **Hot Reload** - Instant development feedback
- **TypeScript** - Compile-time type checking
- **ESLint** - Code quality enforcement
- **Prettier** - Consistent code formatting

## Deployment Considerations

### Database

- **PostgreSQL** - Production database
- **Connection Pooling** - Database connection management
- **Migrations** - Database schema versioning

### Hosting

- **Vercel** - Recommended for Next.js
- **Environment Variables** - Secure configuration
- **CDN** - Asset delivery optimization

## Security Features

### Database Security

- **Parameterized Queries** - SQL injection prevention
- **Connection Validation** - Database health checks
- **Environment Isolation** - Development vs production configs

### API Security

- **Input Validation** - Request parameter validation
- **Error Handling** - Secure error responses
- **Rate Limiting** - API abuse prevention (planned)

## Future Enhancements

### Planned Features

1. **Shopping Cart** - Add to cart functionality
2. **User Authentication** - User accounts and sessions
3. **Order Management** - Purchase flow
4. **Admin Panel** - Product management interface
5. **Payment Integration** - Stripe/PayPal integration
6. **Inventory Management** - Stock tracking
7. **Wishlist** - Save favorite products
8. **Reviews System** - Customer feedback

### Technical Improvements

1. **Testing Suite** - Unit and integration tests
2. **Performance Monitoring** - Application performance tracking
3. **Analytics Integration** - User behavior tracking
4. **SEO Enhancement** - Better search engine optimization
5. **Mobile App** - React Native companion app

## Key Code Patterns

### Error Handling

```typescript
try {
  const result = await someAsyncOperation();
  return NextResponse.json(result);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  return NextResponse.json(
    { error: 'Failed to fetch products', message: errorMessage },
    { status: 500 }
  );
}
```

### Component Structure

```typescript
'use client';

import { useState, useEffect } from 'react';
import { CustomHook } from '@/lib/hooks/useCustomHook';

interface ComponentProps {
  data: DataType;
  variant?: 'default' | 'alternative';
}

export default function Component({ data, variant = 'default' }: ComponentProps) {
  const [state, setState] = useState<StateType>(initialState);
  const { result } = CustomHook();

  useEffect(() => {
    // Side effects
  }, [dependencies]);

  return (
    <div className="component-styles">
      {/* Component JSX */}
    </div>
  );
}
```

### API Route Structure

```typescript
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parameter = searchParams.get('parameter');

    // Business logic
    const data = await prisma.model.findMany({
      where: {
        /* conditions */
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
```

## Testing Strategy

### Current Testing Status

- **Unit Tests** - Not implemented
- **Integration Tests** - Not implemented
- **E2E Tests** - Not implemented

### Recommended Testing Approach

1. **Component Tests** - React Testing Library
2. **API Tests** - Supertest for API routes
3. **Database Tests** - Prisma test database
4. **E2E Tests** - Playwright/Cypress

## Monitoring & Analytics

### Current Monitoring

- **Health Checks** - `/api/health` endpoint
- **Error Logging** - Console logging in development
- **Database Monitoring** - Connection status tracking

### Recommended Monitoring

1. **Error Tracking** - Sentry integration
2. **Performance Monitoring** - Vercel Analytics
3. **User Analytics** - Google Analytics
4. **Database Monitoring** - Prisma Pulse

---

**Last Updated:** 2025-11-13
**Version:** 1.0.0
**Maintainer:** Divyafal Development Team
