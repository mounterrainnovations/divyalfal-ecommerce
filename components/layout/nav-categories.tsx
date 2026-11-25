'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { CategoryTile } from '@/lib/content/showcase';
import { useShowcase } from '@/lib/hooks/useShowcase';

/**
 * The shop's categories, as the navigation bar needs them.
 *
 * WHY THIS IS NOT A SECOND LIST. The owner asked for the categories to be in the nav the way a
 * clothing shop's menu shows them. The obvious implementation is to read `CATEGORY_CONFIG`
 * here, which would have worked on the day it was written and then drifted: the Categories
 * screen in the portal lets the owner reorder the tiles, swap a photograph and hide one, and a
 * nav built on the constant would have kept offering a category the homepage had stopped
 * showing. `useShowcase` is the same source the homepage strip draws from, defaults and all, so
 * the two cannot disagree — and because the hook seeds from the hard-coded six, the menu has
 * its full contents on the very first paint, before any request is made.
 *
 * Hidden tiles are filtered here rather than in the hook for the same reason the strip filters
 * them there: the portal's own screen needs the hidden ones.
 */
export function useNavCategories(): CategoryTile[] {
  const { categories } = useShowcase();
  return categories.filter(category => category.visible);
}

/**
 * THE DISPLAY NAME IS THE FILTER VALUE, and that is the whole reason this is a function rather
 * than six strings. `/products` reads `categories` and matches it against the display name via
 * `CATEGORY_MAPPING`; a hand-written slug ("indo-western", "kurta-pant") parses fine, matches
 * nothing, and renders an empty listing with no error anywhere to tell you why. Building the
 * href in one place means that mistake can only be made once.
 */
export function categoryHref(name: string): string {
  return `/products?categories=${encodeURIComponent(name)}`;
}

/**
 * The desktop mega-menu's contents: the categories as picture-and-name cards.
 *
 * The thumbnails are the owner's own category photographs — the same files the homepage strip
 * uses — so the menu is recognisably the shop rather than a list of words. They are small and
 * fixed, hence the exact `sizes`: without it next/image would fetch the 3840px variant of a
 * 3606x5409 source for each of six thumbnails to draw it at 80 CSS px.
 *
 * One column per category, circle above name, because the panel spans the whole bar and a
 * three-wide grid of name-beside-picture rows left most of a 1280px measure empty between the
 * columns — the menu read as a half-filled table. Six columns also make it the same figure as
 * the homepage's "Shop by Category" strip, which is the right thing for the two places in the
 * site that show the same six things.
 */
export function NavCategoryCards({
  categories,
  onNavigate,
}: {
  categories: CategoryTile[];
  onNavigate: () => void;
}) {
  return (
    <ul className="grid grid-cols-6 gap-x-4">
      {categories.map(category => (
        <li key={category.name}>
          <Link
            href={categoryHref(category.name)}
            onClick={onNavigate}
            className="group flex flex-col items-center gap-3 rounded-lg px-2 py-3 text-center transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gray-100 lg:h-20 lg:w-20">
              <Image
                src={category.image}
                alt=""
                fill
                sizes="(max-width: 1024px) 64px, 80px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </span>
            <span className="font-serif text-base leading-tight text-gray-900 lg:text-lg">
              {category.name}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * The same categories inside the mobile drawer, where there is no room for thumbnails beside
 * six names and a 64px picture per row would push the last category below the fold on a 390px
 * phone. Names only, at a 48px touch target apiece.
 */
export function NavCategoryList({
  categories,
  onNavigate,
}: {
  categories: CategoryTile[];
  onNavigate: () => void;
}) {
  return (
    <ul className="mt-1 flex flex-col border-l border-gray-200 pl-4">
      {categories.map(category => (
        <li key={category.name}>
          <Link
            href={categoryHref(category.name)}
            onClick={onNavigate}
            className="flex min-h-[48px] items-center rounded-md px-2 -mx-2 text-base text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
          >
            {category.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
