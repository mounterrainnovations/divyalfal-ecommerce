# Complete Guide to Next.js, Serverless Backend & Vercel Integration

## Table of Contents

1. [What is Next.js?](#what-is-nextjs)
2. [Understanding the App Router Architecture](#app-router-architecture)
3. [Serverless Functions and API Routes](#serverless-functions)
4. [Frontend-Backend Connection Patterns](#frontend-backend-connection)
5. [Database Integration with Prisma](#database-integration)
6. [Vercel Deployment Configuration](#vercel-deployment)
7. [Your Project Structure Analysis](#project-structure-analysis)
8. [Practical Examples & Code Patterns](#practical-examples)
9. [Best Practices & Troubleshooting](#best-practices)

---

## What is Next.js? {#what-is-nextjs}

### The Big Picture

Next.js is a **React framework** that extends React with additional features for building production-ready web applications. Think of it as React with superpowers.

### Why Next.js Exists

**Traditional React Problems:**

- ❌ SEO issues (content loads after JavaScript execution)
- ❌ No automatic code splitting
- ❌ Complex routing setup
- ❌ No built-in server-side rendering
- ❌ Poor performance for larger applications

**Next.js Solutions:**

- ✅ **Server-Side Rendering (SSR)** - Fast page loads, great SEO
- ✅ **Static Generation (SSG)** - Pre-built pages for blazing speed
- ✅ **Incremental Static Regeneration (ISR)** - Hybrid approach
- ✅ **Automatic Code Splitting** - Only loads necessary code
- ✅ **File-based Routing** - Simple, intuitive routing
- ✅ **API Routes** - Backend functionality without separate server
- ✅ **Image Optimization** - Automatic image optimization
- ✅ **CSS-in-JS Support** - Styled-components, CSS modules, Tailwind

### Key Concepts Explained Simply

#### 1. **Server-Side Rendering (SSR)**

```javascript
// Traditional React - Client-side rendering
const HomePage = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(setData);
  }, []);

  return <div>{data ? data.title : 'Loading...'}</div>;
};

// Next.js - Server-side rendering
export default async function HomePage() {
  // This runs on the SERVER, not in the browser
  const res = await fetch('https://api.example.com/products');
  const products = await res.json();

  return <div>{products.title}</div>; // Already has data!
}
```

#### 2. **Static Site Generation (SSG)**

```javascript
// Pre-builds the page at build time
export async function getStaticProps() {
  const products = await fetchProducts();

  return {
    props: { products }, // Will be pre-rendered at build time
    revalidate: 60, // Rebuild every 60 seconds
  };
}
```

#### 3. **Client-Side Rendering (CSR)**

```javascript
'use client'; // This directive tells Next.js this component needs client-side JS

import { useState, useEffect } from 'react';

export default function InteractiveComponent() {
  const [count, setCount] = useState(0); // Uses React hooks - needs JavaScript

  return <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>;
}
```

---

## Understanding the App Router Architecture {#app-router-architecture}

### The New App Router (Next.js 13+)

Your project uses the **App Router** which is the modern way to structure Next.js applications.

#### File Structure and Routing Magic

```
app/
├── page.tsx              # Route: /
├── layout.tsx            # Root layout for all pages
├── globals.css           # Global styles
├── products/
│   └── page.tsx          # Route: /products
├── product/
│   └── [id]/
│       └── page.tsx      # Route: /product/[id] (dynamic route)
└── api/
    └── products/
        └── route.ts      # API endpoint: /api/products
```

### How Routing Works

1. **File-based routing**: Each file in `app/` becomes a route
2. **Nested folders** create nested routes
3. **Square brackets `[param]`** create dynamic routes
4. **Parenthesis `(groups)`** are for organization (not included in URL)

#### Real Examples from Your Project:

**Static Route:**

```javascript
// app/products/page.tsx → https://yourapp.com/products
export default function ProductsPage() {
  return <h1>All Products</h1>;
}
```

**Dynamic Route:**

```javascript
// app/product/[id]/page.tsx → https://yourapp.com/product/123
export default function ProductPage({ params }: { params: { id: string } }) {
  return <h1>Product {params.id}</h1>;
}
```

**Layout System:**

```javascript
// app/layout.tsx → Wraps ALL pages
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <NavBar /> {/* This appears on EVERY page */}
        <main>{children}</main> {/* Page content goes here */}
        <Footer />
      </body>
    </html>
  );
}
```

### Server vs Client Components

#### Server Components (Default)

```javascript
// Server Component - runs on the server, fast, SEO-friendly
export default async function ProductList() {
  // This fetch happens on the SERVER
  const products = await fetchProducts();

  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

#### Client Components

```javascript
'use client'; // Must explicitly mark as client component

// Client Component - runs in browser, can use state, effects
export default function SearchBox() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <input
      value={searchTerm}
      onChange={e => setSearchTerm(e.target.value)}
      placeholder="Search products..."
    />
  );
}
```

**When to Use Each:**

- **Server Components**: Data fetching, SEO content, static content
- **Client Components**: Interactive features, state management, event handlers

---

## Serverless Functions and API Routes {#serverless-functions}

### What are Serverless Functions?

Serverless functions are **small, independent pieces of code** that run in the cloud and scale automatically. Think of them as tiny servers that handle one specific task.

#### Traditional Server vs Serverless

**Traditional Server:**

```
Your Computer
├── Express.js Server
│   ├── Product endpoints
│   ├── User endpoints
│   ├── Order endpoints
│   └── Database connections
└── Always running, costs money 24/7
```

**Serverless Functions:**

```
Cloud Provider (Vercel)
├── Function 1: /api/products
├── Function 2: /api/products/[id]
├── Function 3: /api/health
└── Each function runs ONLY when called, scales automatically
```

### Your API Routes Analysis

#### 1. Health Check Route

```javascript
// app/api/health/route.ts
export async function GET() {
  try {
    // Check if database is connected
    const productCount = await prisma.product.count();

    return NextResponse.json({
      status: 'healthy',
      productCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ status: 'unhealthy', error: error.message }, { status: 500 });
  }
}
```

**What this does:**

- Provides a health check endpoint
- Tests database connectivity
- Returns JSON response
- Handles errors gracefully

#### 2. Products API Route

```javascript
// app/api/products/route.ts
export async function GET(request: Request) {
  // 1. Parse URL parameters
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const categories = searchParams.get('categories')?.split(',');
  const page = Number(searchParams.get('page')) || 1;

  // 2. Build database query
  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { specifications: { contains: search, mode: 'insensitive' } }
    ];
  }

  // 3. Execute query with pagination
  const skip = (page - 1) * 20;
  const products = await prisma.product.findMany({
    where,
    skip,
    take: 20,
    orderBy: { createdAt: 'desc' }
  });

  // 4. Return formatted response
  return NextResponse.json({ products, page, totalPages });
}

export async function POST(req: Request) {
  // Create new product
  const data = await req.json();
  const product = await prisma.product.create({ data });
  return NextResponse.json(product, { status: 201 });
}
```

#### 3. Dynamic Product Route

```javascript
// app/api/products/[id]/route.ts
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // Get ID from URL
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(product);
}
```

### How API Routes Work in Next.js

1. **File Location**: Any file in `app/api/` becomes an API endpoint
2. **HTTP Methods**: `GET`, `POST`, `PUT`, `DELETE` functions handle different HTTP methods
3. **Request Object**: First parameter provides request data
4. **Dynamic Routes**: Use `[param]` in folder names
5. **Response**: Return `NextResponse.json()` for JSON responses

---

## Frontend-Backend Connection Patterns {#frontend-backend-connection}

### How Your Frontend Connects to Backend

#### 1. **Direct API Calls from Components**

```javascript
// components/features/products/product-list.tsx
'use client';

import { useState, useEffect } from 'react';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Direct API call to your serverless function
    fetch('/api/products?page=1&limit=20')
      .then(res => res.json())
      .then(data => {
        setProducts(data.products);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch products:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading products...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

#### 2. **Server-Side Data Fetching**

```javascript
// app/products/page.tsx - Server Component
import { transformDbProductsToProducts } from '@/lib/utils/product-utils';

export default async function ProductsPage() {
  // This runs on the server, faster than client-side fetch
  const response = await fetch('https://your-domain.vercel.app/api/products', {
    // This ensures the data is fresh on each request
    cache: 'no-store',
  });

  const data = await response.json();
  const products = transformDbProductsToProducts(data.products);

  return (
    <div>
      <h1>All Products</h1>
      <ProductGrid products={products} />
    </div>
  );
}
```

#### 3. **Database-Firect Server Components**

```javascript
// app/product/[id]/page.tsx - Server Component with direct DB access
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';

export default async function ProductPage({ params }: { params: { id: string } }) {
  // Direct database query (no HTTP request needed)
  const dbProduct = await prisma.product.findUnique({
    where: { id: params.id }
  });

  if (!dbProduct) {
    notFound(); // Show 404 page
  }

  return (
    <div>
      <h1>{dbProduct.name}</h1>
      <p>₹{dbProduct.price}</p>
      {/* Transform and display product data */}
    </div>
  );
}
```

### State Management and Data Flow

#### 1. **Client-Side State (Local State)**

```javascript
'use client';
import { useState } from 'react';

export function ProductFilters() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 100000]);

  const updateFilters = newFilters => {
    setSearchTerm(newFilters.search);
    setSelectedCategories(newFilters.categories);
    setPriceRange(newFilters.priceRange);
  };

  return (
    <div>
      <input value={searchTerm} onChange={e => updateFilters({ search: e.target.value })} />
      {/* More filters */}
    </div>
  );
}
```

#### 2. **Server State (External Data)**

```javascript
// Server Component - manages server-side data
export default async function ProductCatalog() {
  // Server-side data fetching
  const products = await prisma.product.findMany({
    where: { category: 'SAREE' },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <ProductFilters />
      <ProductGrid products={products} />
    </div>
  );
}
```

---

## Database Integration with Prisma {#database-integration}

### What is Prisma?

Prisma is an **Object-Relational Mapping (ORM)** tool that makes database interactions easier. Think of it as a translator between your JavaScript code and your database.

### How Prisma Works

#### 1. **Schema Definition**

```prisma
// prisma/schema.prisma
model Product {
  id             String      @id @default(uuid())
  name           String      @db.VarChar(255)
  photos         String[]
  price          Decimal     @db.Decimal(10, 2)
  specifications String
  category       ProductType @default(OTHER)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  @@map("Product") // Maps to "Product" table in database
}

enum ProductType {
  SAREE
  INDO_WESTERN
  LEHENGA
  SUIT
  KURTA_PANT
  WESTERN
  OTHER
}
```

#### 2. **Database Connection**

```javascript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

// Singleton pattern to prevent connection exhaustion
const prismaGlobal = global as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  prismaGlobal.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (!prismaGlobal.prisma) {
  prismaGlobal.prisma = prisma;
}
```

**Why Singleton Pattern?**

- Prevents creating multiple database connections
- Important in serverless environments
- Prevents connection pool exhaustion

#### 3. **Database Operations**

**Create (Insert):**

```javascript
const newProduct = await prisma.product.create({
  data: {
    name: 'Beautiful Saree',
    price: new Decimal(25000),
    specifications: 'Silk fabric with golden border',
    category: 'SAREE',
    photos: ['saree1.jpg', 'saree2.jpg'],
  },
});
```

**Read (Select):**

```javascript
// Get all products
const allProducts = await prisma.product.findMany();

// Get products with filters
const filteredProducts = await prisma.product.findMany({
  where: {
    category: 'SAREE',
    price: {
      gte: 10000, // Greater than or equal
      lte: 50000, // Less than or equal
    },
  },
  orderBy: {
    createdAt: 'desc', // Newest first
  },
  take: 20, // Limit results
  skip: 0, // Offset for pagination
});

// Get single product
const product = await prisma.product.findUnique({
  where: { id: '123e4567-e89b-12d3-a456-426614174000' },
});
```

**Update:**

```javascript
const updatedProduct = await prisma.product.update({
  where: { id: '123e4567-e89b-12d3-a456-426614174000' },
  data: {
    name: 'Updated Product Name',
    price: new Decimal(30000),
  },
});
```

**Delete:**

```javascript
await prisma.product.delete({
  where: { id: '123e4567-e89b-12d3-a456-426614174000' },
});
```

### Type Safety and Data Transformation

#### 1. **Database Types vs Frontend Types**

```javascript
// types/index.ts - Frontend types
export interface Product {
  id: string;
  name: string;
  price: number; // Simple number for UI
  image: string;
  category: string;
  specifications?: string;
}

// Database uses Prisma.Decimal for precise money handling
export interface DbProduct {
  id: string;
  name: string;
  price: Prisma.Decimal | string | number;
  category: ProductType;
  // ... other fields
}
```

#### 2. **Data Transformation**

```javascript
// lib/utils/product-utils.ts
export const transformDbProductToProduct = (dbProduct: DbProduct): Product => {
  return {
    id: dbProduct.id,
    name: dbProduct.name,
    // Convert Prisma.Decimal to simple number for frontend
    price: typeof dbProduct.price === 'string'
      ? Number(db.price)
      : Number(dbProduct.price),
    image: dbProduct.photos[0] || '/default-image.jpg',
    category: CATEGORY_MAPPING_REVERSE[dbProduct.category] || 'Western',
    specifications: dbProduct.specifications
  };
};
```

---

## Vercel Deployment Configuration {#vercel-deployment}

### How Vercel Works with Next.js

Vercel is specifically designed for Next.js and provides seamless deployment with automatic optimization.

#### 1. **Build Process**

```json
// package.json - Build scripts
{
  "scripts": {
    "dev": "next dev", // Local development
    "build": "prisma generate && next build", // Production build
    "start": "next start", // Start production server
    "vercel-build": "prisma generate && next build" // Vercel build
  }
}
```

**Build Steps:**

1. `prisma generate` - Creates TypeScript types and Prisma Client
2. `next build` - Compiles Next.js application
3. Vercel optimizes and deploys

#### 2. **Vercel Configuration**

```json
// vercel.json
{
  "buildCommand": "npx prisma generate && next build",
  "functions": {
    "app/api/**/*.ts": {
      "includeFiles": "node_modules/.prisma/client/**"
    },
    "app/product/**/*.tsx": {
      "includeFiles": "node_modules/.prisma/client/**"
    }
  }
}
```

**What this does:**

- Defines custom build command for Vercel
- Ensures Prisma client is included in serverless functions
- Optimizes function size and cold starts

#### 3. **Environment Variables**

```bash
# .env (local development)
DATABASE_URL="postgresql://username:password@localhost:5432/divyafal"
DIRECT_URL="postgresql://username:password@localhost:5432/divyafal"

# In Vercel Dashboard - Production Variables
DATABASE_URL="postgresql://username:password@prod-host:5432/divyafal"
DIRECT_URL="postgresql://username:password@prod-host:5432/divyafal"
```

#### 4. **How Serverless Functions Scale**

**Cold Start:**

```
First request to /api/products
└── Vercel starts a new serverless function (cold start)
    ├── Load Node.js runtime
    ├── Load your code
    ├── Load Prisma client
    └── Execute your function
    └── Return response
    └── Function stays warm for ~10 minutes
```

**Warm Requests:**

```
Subsequent requests to /api/products
└── Reuse existing warm function (fast!)
    ├── Execute your code directly
    └── Return response
```

### Edge vs Serverless Functions

#### Serverless Functions (Your Current Setup)

```javascript
// app/api/products/route.ts
export async function GET(request: Request) {
  // Runs in Node.js runtime
  // Can use Prisma, filesystem, external APIs
  const products = await prisma.product.findMany();
  return NextResponse.json(products);
}
```

#### Edge Functions (Alternative)

```javascript
// app/api/health/route.ts
export const runtime = 'edge';

export async function GET(request: Request) {
  // Runs in Edge runtime (faster, global)
  // Cannot use Prisma (no Node.js APIs)
  // Best for simple logic, redirects, authentication
  return new Response(JSON.stringify({ status: 'healthy' }), {
    headers: { 'content-type': 'application/json' }
  });
}
```

---

## Your Project Structure Analysis {#project-structure-analysis}

### Complete File Organization Breakdown

```
your-project/
├── 📁 app/                          # App Router - All pages and API routes
│   ├── 📄 page.tsx                  # Home page (/)
│   ├── 📄 layout.tsx                # Root layout (wraps all pages)
│   ├── 📄 globals.css               # Global styles
│   ├── 📁 products/                 # Products section
│   │   └── 📄 page.tsx              # /products page
│   ├── 📁 product/                  # Individual product pages
│   │   └── 📁 [id]/
│   │       ├── 📄 page.tsx          # /product/[id] page
│   │       └── 📄 not-found.tsx     # 404 page for products
│   ├── 📁 contact-us/               # Contact page
│   │   └── 📄 page.tsx              # /contact-us page
│   └── 📁 api/                      # Serverless API endpoints
│       ├── 📁 health/
│       │   └── 📄 route.ts          # /api/health endpoint
│       └── 📁 products/
│           ├── 📄 route.ts          # /api/products endpoint
│           └── 📁 [id]/
│               └── 📄 route.ts      # /api/products/[id] endpoint
├── 📁 components/                   # Reusable UI components
│   ├── 📁 features/                 # Feature-specific components
│   │   ├── 📁 carousel/
│   │   │   └── 📄 spotlight-carousel.tsx
│   │   ├── 📁 forms/
│   │   │   └── 📄 contact-form.tsx
│   │   └── 📁 products/
│   │       ├── 📄 product-card.tsx          # Product display card
│   │       ├── 📄 product-details.tsx       # Detailed product view
│   │       ├── 📄 product-hero.tsx          # Product hero section
│   │       └── 📄 you-may-also-like.tsx     # Related products
│   ├── 📁 layout/                   # Layout components
│   │   ├── 📄 navbar.tsx                   # Navigation bar
│   │   ├── 📄 footer.tsx                   # Footer
│   │   ├── 📄 hero.tsx                     # Home page hero
│   │   └── 📄 contact-us-hero.tsx          # Contact page hero
│   └── 📁 sections/                 # Page sections
│       ├── 📄 about.tsx                    # About section
│       ├── 📄 categories.tsx               # Product categories
│       ├── 📄 testimonials.tsx             # Customer testimonials
│       └── 📄 shop-by-style.tsx            # Style-based shopping
├── 📁 lib/                          # Utility libraries
│   ├── 📄 db.ts                     # Prisma database client
│   ├── 📄 utils.ts                  # General utilities
│   ├── 📁 data/
│   │   └── 📄 mock-products.ts      # Static data and configurations
│   ├── 📁 utils/
│   │   └── 📄 product-utils.ts      # Product-specific utilities
│   └── 📁 hooks/
│       ├── 📄 useImagePreloader.ts  # Custom React hooks
│       └── 📄 useMedia.ts           # Media query hooks
├── 📁 public/                       # Static assets
│   ├── 📄 DivyafalLogo.png         # Brand logo
│   ├── 📄 favicon.ico               # Website favicon
│   ├── 📁 categories/               # Category images
│   ├── 📁 collection/               # Product collection images
│   ├── 📁 mostrec/                  # Most recommended products
│   └── 📁 testimonials/             # Customer testimonial images
├── 📁 prisma/                       # Database schema and migrations
│   ├── 📄 schema.prisma             # Database schema definition
│   └── 📁 migrations/               # Database migration files
├── 📄 package.json                  # Dependencies and scripts
├── 📄 next.config.ts                # Next.js configuration
├── 📄 vercel.json                   # Vercel deployment config
├── 📄 tailwind.config.js            # Tailwind CSS configuration
├── 📄 tsconfig.json                 # TypeScript configuration
└── 📄 .env                          # Environment variables
```

### How Each Part Connects

#### 1. **Data Flow Example: Loading Product Page**

```
User visits: /product/123

1. Next.js Routing
   └── app/product/[id]/page.tsx (Server Component)

2. Server Component Execution
   └── const { id } = await params
   └── const dbProduct = await prisma.product.findUnique({ where: { id } })

3. Data Transformation
   └── const product = transformDbProductToProduct(dbProduct)

4. Component Rendering
   └── <ProductDetails product={product} />
   └── <ProductHero images={product.photos} />
   └── <YouMayAlsoLike category={product.category} />

5. Server Response
   └── HTML + CSS + JavaScript sent to browser
```

#### 2. **API Data Flow Example: Product Listing**

```
User visits: /products

1. Client Component (ProductFilters)
   └── useState: { search: '', category: 'all', price: [0, 100000] }

2. Filter Change
   └── fetch(`/api/products?search=${search}&categories=${category}&page=1`)

3. Serverless Function (app/api/products/route.ts)
   └── Parse URL parameters
   └── Build Prisma query with filters
   └── Execute: prisma.product.findMany({ where, orderBy, take, skip })
   └── Transform results
   └── return NextResponse.json({ products, total, page, totalPages })

4. Client Component Update
   └── setProducts(data.products)
   └── setLoading(false)
   └── Render ProductGrid
```

#### 3. **Database Relationship Pattern**

```
Prisma Schema (Database Structure)
└── Product Model
    ├── id: UUID (unique identifier)
    ├── name: String
    ├── photos: String[] (array of image URLs)
    ├── price: Decimal (precise money calculations)
    ├── specifications: String
    ├── category: Enum (SAREE, LEHENGA, etc.)
    ├── createdAt: DateTime
    └── updatedAt: DateTime

TypeScript Types (Frontend Interface)
└── interface Product
    ├── id: string
    ├── name: string
    ├── price: number (converted from Decimal)
    ├── image: string (first photo or default)
    ├── category: string (mapped from enum)
    └── specifications?: string

Utility Functions (Data Transformation)
└── transformDbProductToProduct()
└── transformDbProductsToProducts()
└── getDbCategory()
└── getFrontendCategory()
```

---

## Practical Examples & Code Patterns {#practical-examples}

### 1. **Complete Product API Endpoint**

```javascript
// app/api/products/route.ts - Complete implementation
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    // Step 1: Parse URL parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || [];
    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
    const sortBy = searchParams.get('sortBy') || 'newest';
    const page = Number(searchParams.get('page')) || 1;
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);

    // Step 2: Build database query
    const where: Prisma.ProductWhereInput = {};

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { specifications: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (categories.length > 0) {
      where.category = { in: categories };
    }

    // Price filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = new Prisma.Decimal(minPrice);
      if (maxPrice !== undefined) where.price.lte = new Prisma.Decimal(maxPrice);
    }

    // Step 3: Build order clause
    const orderBy: Prisma.ProductOrderByWithRelationInput = {};
    switch (sortBy) {
      case 'price-low':
        orderBy.price = 'asc';
        break;
      case 'price-high':
        orderBy.price = 'desc';
        break;
      case 'name':
        orderBy.name = 'asc';
        break;
      case 'newest':
      default:
        orderBy.createdAt = 'desc';
        break;
    }

    // Step 4: Execute query with pagination
    const skip = (page - 1) * limit;
    const [total, dbProducts] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    // Step 5: Transform and return data
    const products = dbProducts.map(dbProduct => ({
      id: dbProduct.id,
      name: dbProduct.name,
      price: Number(dbProduct.price),
      image: dbProduct.photos[0] || '/default-image.jpg',
      category: dbProduct.category,
      specifications: dbProduct.specifications,
    }));

    return NextResponse.json({
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST - Create new product
export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Validate required fields
    if (!data.name || !data.price) {
      return NextResponse.json(
        { error: 'Name and price are required' },
        { status: 400 }
      );
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        id: data.id || crypto.randomUUID(),
        name: data.name,
        price: new Prisma.Decimal(data.price),
        specifications: data.specifications || '',
        category: data.category || 'OTHER',
        photos: data.photos || [],
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
```

### 2. **Complete Product Page with Dynamic Data**

```javascript
// app/product/[id]/page.tsx
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { transformDbProductToProduct } from '@/lib/utils/product-utils';
import ProductDetails from '@/components/features/products/product-details';
import ProductHero from '@/components/features/products/product-hero';
import YouMayAlsoLike from '@/components/features/products/you-may-also-like';

export default async function ProductPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;

  // Fetch product from database
  const dbProduct = await prisma.product.findUnique({
    where: { id }
  });

  // Handle product not found
  if (!dbProduct) {
    notFound();
  }

  // Transform for frontend
  const product = transformDbProductToProduct(dbProduct);

  // Fetch related products
  const relatedProducts = await prisma.product.findMany({
    where: {
      category: dbProduct.category,
      id: { not: id } // Exclude current product
    },
    take: 4,
    orderBy: { createdAt: 'desc' }
  });

  const transformedRelatedProducts = relatedProducts.map(transformDbProductToProduct);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Product Hero Section */}
      <ProductHero
        name={product.name}
        images={product.photos}
        price={product.price}
        category={product.category}
      />

      {/* Product Details */}
      <ProductDetails
        specifications={product.specifications}
        price={product.price}
        category={product.category}
      />

      {/* Related Products */}
      <section className="mt-16">
        <h2 className="text-3xl font-bold mb-8">You May Also Like</h2>
        <YouMayAlsoLike products={transformedRelatedProducts} />
      </section>
    </div>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id }
  });

  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  return {
    title: `${product.name} - Divyafal`,
    description: product.specifications,
    openGraph: {
      title: product.name,
      description: product.specifications,
      images: product.photos,
    },
  };
}
```

### 3. **Interactive Product Filters Component**

```javascript
// components/features/products/product-filters.tsx
'use client';

import { useState, useEffect } from 'react';
import { categories, priceRanges, sortOptions } from '@/lib/data/mock-products';
import type { ProductCategory, PriceRange } from '@/types';

interface ProductFiltersProps {
  onFiltersChange: (filters: {
    search: string;
    categories: ProductCategory[];
    priceRange: PriceRange | null;
    sortBy: string;
  }) => void;
}

export default function ProductFilters({ onFiltersChange }: ProductFiltersProps) {
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<ProductCategory[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<PriceRange | null>(null);
  const [sortBy, setSortBy] = useState('newest');

  // Update parent component when filters change
  useEffect(() => {
    onFiltersChange({
      search,
      categories: selectedCategories,
      priceRange: selectedPriceRange,
      sortBy
    });
  }, [search, selectedCategories, selectedPriceRange, sortBy, onFiltersChange]);

  // Handle category selection
  const handleCategoryToggle = (category: ProductCategory) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch('');
    setSelectedCategories([]);
    setSelectedPriceRange(null);
    setSortBy('newest');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Filters</h3>
        <button
          onClick={clearFilters}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Clear All
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Search</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Categories */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3">Categories</label>
        <div className="space-y-2">
          {categories.map(category => (
            <label key={category} className="flex items-center">
              <input
                type="checkbox"
                checked={selectedCategories.includes(category)}
                onChange={() => handleCategoryToggle(category)}
                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">{category}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3">Price Range</label>
        <div className="space-y-2">
          {priceRanges.map(range => (
            <label key={range.label} className="flex items-center">
              <input
                type="radio"
                name="priceRange"
                checked={selectedPriceRange?.label === range.label}
                onChange={() => setSelectedPriceRange(range)}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">{range.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div>
        <label className="block text-sm font-medium mb-2">Sort By</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {sortOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
```

### 4. **Complete Product Grid with API Integration**

```javascript
// components/features/products/product-grid.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import ProductCard from './product-card';
import ProductFilters from './product-filters';
import type { Product, ProductCategory, PriceRange } from '@/types';

interface ProductGridProps {
  initialProducts?: Product[];
}

export default function ProductGrid({ initialProducts = [] }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    categories: [] as ProductCategory[],
    priceRange: null as PriceRange | null,
    sortBy: 'newest'
  });

  // Build API URL with parameters
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: '20',
      sortBy: filters.sortBy
    });

    if (filters.search) {
      params.append('search', filters.search);
    }

    if (filters.categories.length > 0) {
      params.append('categories', filters.categories.join(','));
    }

    if (filters.priceRange) {
      params.append('minPrice', filters.priceRange.min.toString());
      params.append('maxPrice', filters.priceRange.max.toString());
    }

    return `/api/products?${params.toString()}`;
  }, [filters, currentPage]);

  // Fetch products when filters change
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const data = await response.json();
        setProducts(data.products);
        setTotalPages(data.totalPages);
        setCurrentPage(data.page);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [apiUrl]);

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <ProductFilters onFiltersChange={handleFiltersChange} />
        </div>

        {/* Products Grid */}
        <div className="lg:col-span-3">
          {/* Results Header */}
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-600">
              {loading ? 'Loading...' : `${products.length} products found`}
            </p>
            <div className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-lg h-80 animate-pulse" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No products found</p>
              <p className="text-gray-400 text-sm mt-2">
                Try adjusting your filters
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border rounded disabled:opacity-50"
                >
                  Previous
                </button>

                {[...Array(totalPages)].map((_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 border rounded ${
                      page === currentPage ? 'bg-blue-500 text-white' : ''
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Best Practices & Troubleshooting {#best-practices}

### 1. **Performance Best Practices**

#### Optimize Database Queries

```javascript
// ✅ Good - Select only needed fields
const products = await prisma.product.findMany({
  select: {
    id: true,
    name: true,
    price: true,
    photos: true,
    category: true,
  },
  where: { category: 'SAREE' },
  take: 20,
});

// ❌ Bad - Selects all fields unnecessarily
const products = await prisma.product.findMany({
  where: { category: 'SAREE' },
  take: 20,
});
```

#### Implement Caching

```javascript
// Cache frequently accessed data
export async function getCategories() {
  const cached = await getCache('categories');
  if (cached) return cached;

  const categories = await prisma.product.findMany({
    select: { category: true },
    distinct: ['category'],
  });

  await setCache('categories', categories, 3600); // Cache for 1 hour
  return categories;
}
```

#### Optimize Images

```javascript
// ✅ Use Next.js Image component
import Image from 'next/image';

<Image
  src="/product-image.jpg"
  alt="Product"
  width={400}
  height={400}
  placeholder="blur" // Shows blurred placeholder while loading
  blurDataURL="data:image/jpeg;base64,..." // Base64 blur placeholder
/>

// ✅ Optimize remote images in next.config.ts
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'duwwgyobnpuqsqdromzj.supabase.co',
      port: '',
      pathname: '/storage/v1/object/public/**',
    },
  ],
  formats: ['image/avif', 'image/webp'], // Modern formats
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  minimumCacheTTL: 60, // Cache for 60 seconds
}
```

### 2. **Serverless-Specific Optimizations**

#### Minimize Cold Starts

```javascript
// ✅ Use singleton patterns
const prismaGlobal = global as unknown as { prisma: PrismaClient | undefined };
export const prisma = prismaGlobal.prisma ?? new PrismaClient();

// ✅ Minimize external imports in API routes
// Only import what you need
import { NextResponse } from 'next/server';

// ❌ Avoid heavy imports
import { complexLibrary } from 'heavy-external-library';
```

#### Efficient Error Handling

```javascript
export async function GET(request: Request) {
  try {
    // Your API logic here
    const data = await fetchData();
    return NextResponse.json(data);
  } catch (error) {
    // Log error for debugging
    console.error('API Error:', error);

    // Return generic error to client
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 3. **Common Issues and Solutions**

#### Issue: "Module not found" errors

```bash
# Solution: Check your imports and paths
# ✅ Correct import
import { Product } from '@/types';

// ❌ Incorrect - relative path mixing
import { Product } from '../types/index';

// ✅ Use path aliases configured in tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

#### Issue: Prisma connection issues

```javascript
// ✅ Use proper connection management
const prismaGlobal = global as unknown as { prisma: PrismaClient | undefined };

export const prisma = prismaGlobal.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  prismaGlobal.prisma = prisma;
}
```

#### Issue: Environment variables not working

```javascript
// ✅ Check environment variables exist
export async function GET() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    return NextResponse.json({ error: 'Database configuration error' }, { status: 500 });
  }

  // Your logic here
}
```

#### Issue: Static assets not loading

```javascript
// ✅ Place static files in /public directory
// Files in /public are served at the root level
// /public/logo.png → https://yoursite.com/logo.png

// ✅ For external images, configure next.config.ts
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'example.com',
      port: '',
      pathname: '/images/**',
    },
  ],
}
```

### 4. **Security Best Practices**

#### Input Validation

```javascript
export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Validate required fields
    if (!data.name || !data.price) {
      return NextResponse.json(
        { error: 'Name and price are required' },
        { status: 400 }
      );
    }

    // Validate data types and ranges
    if (typeof data.name !== 'string' || data.name.length > 255) {
      return NextResponse.json(
        { error: 'Invalid name' },
        { status: 400 }
      );
    }

    if (typeof data.price !== 'number' || data.price < 0) {
      return NextResponse.json(
        { error: 'Invalid price' },
        { status: 400 }
      );
    }

    // Your logic here

  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    );
  }
}
```

#### Rate Limiting (for production)

```javascript
// Consider using rate limiting for API routes
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';

  const { success } = await rateLimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  // Your API logic
}
```

### 5. **Debugging Tips**

#### Enable Detailed Logging

```javascript
// Add logging to your API routes
export async function GET(request: Request) {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] GET /api/products - Started`);

  try {
    // Your logic
    const products = await prisma.product.findMany();

    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] GET /api/products - Completed in ${duration}ms`);

    return NextResponse.json({ products });
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[${new Date().toISOString()}] GET /api/products - Error in ${duration}ms:`, error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### Database Query Logging

```javascript
// Enable Prisma query logging in development
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// This will log all SQL queries in development
```

#### Type Safety

```javascript
// ✅ Always use proper types
interface ProductFilters {
  search?: string;
  categories?: ProductType[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const filters: ProductFilters = {
    search: searchParams.get('search') || undefined,
    categories: searchParams.get('categories')?.split(',') as ProductType[],
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    sortBy: searchParams.get('sortBy') || 'newest',
    page: Number(searchParams.get('page')) || 1,
    limit: Math.min(Number(searchParams.get('limit')) || 20, 100)
  };
}
```

---

## Summary

This comprehensive guide covers:

1. **Next.js Fundamentals**: Understanding what Next.js is, why it exists, and how it solves traditional React problems
2. **App Router Architecture**: How the file-based routing system works and when to use server vs client components
3. **Serverless Functions**: How API routes work as serverless functions and scale automatically
4. **Frontend-Backend Connection**: Different patterns for connecting your React frontend to your serverless backend
5. **Database Integration**: How Prisma works as an ORM and handles database operations
6. **Vercel Deployment**: How Vercel optimizes Next.js applications and handles serverless scaling
7. **Project Structure Analysis**: Detailed breakdown of your specific project and how everything connects
8. **Practical Examples**: Real code examples showing complete implementations
9. **Best Practices**: Performance optimization, security, and troubleshooting tips

### Key Takeaways

- **Next.js = React with superpowers** - SSR, SSG, ISR, routing, and API routes built-in
- **App Router is modern** - Use `app/` directory for new projects
- **Serverless = Automatic scaling** - Functions run only when called, scale to zero
- **Prisma = Type-safe database access** - Write TypeScript, get type-safe SQL
- **Vercel = Optimized for Next.js** - Automatic deployment, optimization, and scaling

### Next Steps

1. **Experiment**: Try modifying your existing components and API routes
2. **Add Features**: Implement new functionality using these patterns
3. **Monitor Performance**: Use Vercel Analytics to track your app's performance
4. **Learn More**: Explore Next.js 13+ features like Server Actions and streaming

This guide should give you a complete understanding of your Next.js application and how all the pieces work together. You now have the knowledge to build, modify, and optimize your serverless Next.js application effectively!
