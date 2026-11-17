'use client';

import { Suspense, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SlidersHorizontal } from 'lucide-react';
import {
  DISCOUNT_GROUP,
  FilterDrawer,
  FilterRail,
  PRICE_GROUP,
} from '@/components/features/products/filter-rail';
import type { FilterRailValue, RangeGroup } from '@/components/features/products/filter-rail';
import Button from '@/components/primitives/Button';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import Eyebrow from '@/components/primitives/Eyebrow';
import HairlineRule from '@/components/primitives/HairlineRule';
import ProductTile from '@/components/primitives/ProductTile';
import Reveal from '@/components/primitives/Reveal';
import { SortDropdown } from '@/components/ui/sort-dropdown';
import { siteCopy } from '@/lib/content/site-copy';
import { sortOptions as productSortOptions } from '@/lib/data/mock-products';
import {
  parseCategoriesParam,
  useDebouncedValue,
  useProductListing,
} from '@/lib/hooks/useProductListing';
import { amountPayable, discountPercent, resolvePrice } from '@/lib/utils/price';
import type { Product } from '@/types';

type Variant = 'products' | 'sale';

const navLabel = (href: string) => siteCopy.nav.items.find(item => item.href === href)?.label ?? '';

/**
 * Sale sorting happens in the browser (the route has no discount sort). `default` is the order
 * the API returned, as it always was; the discount sorts are offered, not imposed.
 */
const SALE_SORT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'discount-high', label: 'Highest Discount' },
  { value: 'discount-low', label: 'Lowest Discount' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest First' },
];

const CONFIG: Record<
  Variant,
  {
    title: string;
    subtitle?: string;
    searchLabel: string;
    searchPlaceholder: string;
    sortOptions: { value: string; label: string }[];
    defaultSort: string;
    range: RangeGroup;
    count: (n: number) => string;
    emptyHeading: string;
    emptyBody: string;
    loadingHeading: string;
    loadingBody: string;
  }
> = {
  products: {
    title: navLabel('/products'),
    searchLabel: 'Search products',
    searchPlaceholder: 'Search products...',
    sortOptions: productSortOptions,
    defaultSort: 'default',
    range: PRICE_GROUP,
    count: n => `${n} ${n === 1 ? 'product' : 'products'} found`,
    emptyHeading: 'No products found',
    emptyBody: siteCopy.products.empty.body,
    loadingHeading: siteCopy.products.loading.heading,
    loadingBody: siteCopy.products.loading.body,
  },
  sale: {
    title: navLabel('/sale'),
    subtitle: siteCopy.sale.hero.subheading,
    searchLabel: 'Search sale products',
    searchPlaceholder: 'Search sale products...',
    sortOptions: SALE_SORT_OPTIONS,
    defaultSort: 'default',
    range: DISCOUNT_GROUP,
    count: n => `${n} ${n === 1 ? 'product' : 'products'} on sale`,
    emptyHeading: 'No sale products found',
    emptyBody: siteCopy.sale.empty.body,
    loadingHeading: siteCopy.sale.loading.heading,
    loadingBody: siteCopy.sale.loading.body,
  },
};

/** What /sale shows: only products whose sale is active, narrowed and ordered in the browser. */
function shapeSale(products: Product[], range: FilterRailValue['range'], sortBy: string) {
  const onSale = products.filter(product => resolvePrice(product).onSale);
  const banded = range
    ? onSale.filter(product => {
        const percent = discountPercent(product);
        return percent >= range.min && percent <= range.max;
      })
    : onSale;
  switch (sortBy) {
    case 'discount-high':
      return [...banded].sort((a, b) => discountPercent(b) - discountPercent(a));
    case 'discount-low':
      return [...banded].sort((a, b) => discountPercent(a) - discountPercent(b));
    case 'price-low':
      return [...banded].sort((a, b) => amountPayable(a) - amountPayable(b));
    case 'price-high':
      return [...banded].sort((a, b) => amountPayable(b) - amountPayable(a));
    default:
      return banded;
  }
}

/**
 * Two tracks from `md`, one on a phone, as a grid rather than CSS columns: columns fill down
 * the first track before the second, so a ranked sort would read down-then-across and a
 * visitor scanning "highest discount" would misread the rank. A grid reads left to right in
 * DOM order. The even cells sit 96px lower, at every count, which is what makes two products
 * read as a composition and not as a plain pair.
 */
const GRID =
  'm-0 grid list-none grid-cols-1 items-start p-0 md:grid-cols-2 md:gap-x-16 md:[&>li:nth-child(even)]:mt-24';
const ITEM = 'mb-12 md:mb-20';

function SkeletonTiles({ className }: { className?: string }) {
  return (
    <ul aria-hidden="true" className={`${GRID} ${className ?? ''}`}>
      {[0, 1, 2, 3].map(index => (
        <li key={index} className={ITEM}>
          <div className="aspect-[3/4] w-full bg-paper-deep" />
          <div className="mt-4 h-4 w-2/3 bg-paper-deep" />
          <div className="mt-2 h-4 w-1/4 bg-paper-deep" />
        </li>
      ))}
    </ul>
  );
}

/**
 * The empty page, set as a page rather than reported as a failure: a display heading, the
 * page's own line, the collection copy, the way out, and the six collections as the
 * typographic index the homepage uses. With two products live this is the normal state of a
 * filtered view, and it has to look decided.
 */
function EmptyState({
  variant,
  filtersActive,
  onReset,
}: {
  variant: Variant;
  filtersActive: boolean;
  onReset: () => void;
}) {
  const { emptyHeading, emptyBody } = CONFIG[variant];
  return (
    <div>
      <HairlineRule />
      <div className="measure flex flex-col items-start gap-6 pt-10 md:pt-14">
        <DisplayHeading level={2} size={2}>
          {emptyHeading}
        </DisplayHeading>
        <p className="font-ui text-caption text-ink-soft">{emptyBody}</p>
        <p className="font-display text-body font-light text-ink">{siteCopy.home.explore.body}</p>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          {filtersActive && <Button onClick={onReset}>Clear Filters</Button>}
          {variant === 'sale' && (
            <Button href="/products" variant={filtersActive ? 'quiet' : 'primary'}>
              {siteCopy.home.explore.cta}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-16 md:mt-20">
        <Eyebrow>{siteCopy.home.categories.heading}</Eyebrow>
        <ul className="m-0 mt-6 list-none p-0">
          {siteCopy.home.categories.items.map(item => (
            <li key={item.name}>
              <HairlineRule />
              <Link
                href={`/products?categories=${encodeURIComponent(item.name)}`}
                className="block py-4 font-display text-display-3 font-light text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
        <HairlineRule />
      </div>
    </div>
  );
}

function ListingBody({ variant }: { variant: Variant }) {
  const config = CONFIG[variant];
  const searchParams = useSearchParams();
  const rawCategories = searchParams.get('categories');

  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<string[]>(() => parseCategoriesParam(rawCategories));
  const [range, setRange] = useState<FilterRailValue['range']>(null);
  const [sortBy, setSortBy] = useState(config.defaultSort);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // A new `?categories=` (a homepage link followed while already on this page) replaces the
  // selection. Adjusted while rendering, keyed on the parameter, so no stale selection paints.
  const [seenParam, setSeenParam] = useState(rawCategories);
  if (seenParam !== rawCategories) {
    setSeenParam(rawCategories);
    setCategories(parseCategoriesParam(rawCategories));
  }

  const [debouncedSearch, setSearchNow] = useDebouncedValue(search);
  const { products, loading, initialLoad, error, retry } = useProductListing(
    variant === 'products'
      ? { search: debouncedSearch, categories, priceRange: range, sortBy }
      : { search: debouncedSearch, categories }
  );

  const visible = useMemo(
    () => (variant === 'sale' ? shapeSale(products, range, sortBy) : products),
    [variant, products, range, sortBy]
  );

  const filterValue: FilterRailValue = { categories, range };
  const activeFilters = categories.length + (range ? 1 : 0);
  const filtersActive = activeFilters > 0 || search !== '';
  const resetAll = () => {
    // The debounced copy is reset in the same batch, so the cleared query is requested once
    // rather than after a stale search has fired first.
    setSearch('');
    setSearchNow('');
    setCategories([]);
    setRange(null);
    setSortBy(config.defaultSort);
  };
  const applyRail = (next: FilterRailValue) => {
    setCategories(next.categories);
    setRange(next.range);
  };

  const empty = !loading && !error && visible.length === 0;
  const status = loading ? config.loadingHeading : error ? '' : config.count(visible.length);

  return (
    <section className="grid-editorial gap-y-10 pb-24 pt-10 md:pb-32">
      <HairlineRule className="col-span-12" />

      <aside
        aria-label="Product filters"
        className="hidden lg:sticky lg:top-28 lg:col-span-3 lg:col-start-2 lg:block lg:self-start"
      >
        <FilterRail value={filterValue} onChange={applyRail} range={config.range} />
      </aside>

      <div className="col-span-12 min-w-0 lg:col-span-7 lg:col-start-5">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="md:w-72">
            <label htmlFor={`${variant}-search`} className="sr-only">
              {config.searchLabel}
            </label>
            <input
              id={`${variant}-search`}
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={config.searchPlaceholder}
              autoComplete="off"
              className="w-full rounded-none border-0 border-b border-ink bg-transparent py-2 font-ui text-caption text-ink placeholder:text-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            />
          </div>
          <SortDropdown options={config.sortOptions} value={sortBy} onValueChange={setSortBy} />
        </div>

        <div className="mt-8 flex items-center justify-between gap-6">
          {/* On a first load the loading block below is the status. With nothing to count, the
              empty state speaks for itself; the status stays for assistive technology. */}
          {!initialLoad && (
            <p
              role="status"
              className={
                empty || error
                  ? 'sr-only'
                  : 'm-0 font-ui text-caption text-ink-soft'
              }
            >
              {status}
            </p>
          )}
          <button
            ref={toggleRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            aria-controls="listing-filters"
            onClick={() => setDrawerOpen(true)}
            className="ml-auto inline-flex min-h-11 items-center gap-2 font-ui text-eyebrow uppercase text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink lg:hidden"
          >
            <SlidersHorizontal size={16} strokeWidth={1.5} aria-hidden="true" />
            {activeFilters > 0 ? `Filters (${activeFilters})` : 'Filters'}
          </button>
        </div>

        <div className="mt-10 md:mt-14">
          {initialLoad ? (
            <>
              <div role="status" className="measure flex flex-col items-start gap-3">
                <DisplayHeading level={2} size={3}>
                  {config.loadingHeading}
                </DisplayHeading>
                <p className="font-ui text-caption text-ink-soft">{config.loadingBody}</p>
              </div>
              <SkeletonTiles className="mt-12" />
            </>
          ) : error ? (
            <div role="alert" className="measure flex flex-col items-start gap-6 pt-6">
              <DisplayHeading level={2} size={2}>
                Something went wrong
              </DisplayHeading>
              <p className="font-ui text-caption text-ink-soft">{error}</p>
              <Button onClick={retry}>Try Again</Button>
            </div>
          ) : visible.length === 0 ? (
            <EmptyState variant={variant} filtersActive={filtersActive} onReset={resetAll} />
          ) : (
            // While a new query loads the previous tiles stay put, so the page keeps its
            // height; nothing is dimmed, because the type must stay at full contrast.
            <ul aria-busy={loading} className={GRID}>
              {visible.map((product, index) => (
                <Reveal as="li" key={product.id} delay={(index % 2) * 60} className={ITEM}>
                  <ProductTile product={product} priority={index < 2} headingLevel={2} />
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </div>

      <FilterDrawer
        id="listing-filters"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        returnFocusRef={toggleRef}
        doneLabel="Apply Filters"
      >
        <FilterRail value={filterValue} onChange={applyRail} range={config.range} />
      </FilterDrawer>
    </section>
  );
}

/**
 * `/products` and `/sale`: one layout, two configurations. The page title is the `h1` and
 * renders outside the Suspense boundary that `useSearchParams` needs, so it is in the server
 * HTML. Tiles are `h2`s beneath it.
 */
export default function ProductListing({ variant }: { variant: Variant }) {
  const { title, subtitle } = CONFIG[variant];
  return (
    <>
      <header className="grid-editorial pt-14 md:pt-24">
        <div className="col-span-12 md:col-span-9 md:col-start-2">
          <DisplayHeading level={1} size={1} className="reveal-text">
            {title}
          </DisplayHeading>
          {subtitle && (
            <p className="measure reveal-text mt-6 font-display text-body font-light text-ink">
              {subtitle}
            </p>
          )}
        </div>
      </header>
      <Suspense
        fallback={
          <section className="grid-editorial gap-y-10 pb-24 pt-10 md:pb-32">
            <HairlineRule className="col-span-12" />
            <div className="col-span-12 lg:col-span-7 lg:col-start-5">
              <SkeletonTiles />
            </div>
          </section>
        }
      >
        <ListingBody variant={variant} />
      </Suspense>
    </>
  );
}
