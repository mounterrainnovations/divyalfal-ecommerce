import { describe, expect, it } from 'vitest';
import { DEFAULT_COLLECTIONS, parseCollections, slugify, visibleCollections } from './collections';

/**
 * `parseCollections` stands between a JSON column, the public homepage and the routing of
 * `/collections/[slug]`, so what it refuses and what it can never produce matter more than
 * what it accepts. The cases below are the ones that would show on the shop's front page if
 * they were wrong: a nameless tile, two collections fighting over one URL, a garment listed
 * twice on a collection's page, or the whole strip vanishing because one row had a bad field.
 */

describe('slugify', () => {
  it('makes a URL segment out of a name', () => {
    expect(slugify('Bridal Couture')).toBe('bridal-couture');
    expect(slugify('  Everyday   Luxe  ')).toBe('everyday-luxe');
    expect(slugify('Festive 2026 / Edit')).toBe('festive-2026-edit');
  });

  it('keeps a transliterated name legible instead of dropping its accented letters', () => {
    expect(slugify('Chikankārī')).toBe('chikankari');
  });

  it('returns nothing for a name with no Latin letters, rather than guessing', () => {
    // The caller decides what to fall back to; only it knows the other slugs.
    expect(slugify('लहंगा')).toBe('');
    expect(slugify('—')).toBe('');
  });
});

describe('parseCollections', () => {
  it('refuses anything that is not an array, so the caller can fall back to the defaults', () => {
    expect(parseCollections(null)).toBeNull();
    expect(parseCollections(undefined)).toBeNull();
    expect(parseCollections('[]')).toBeNull();
    expect(parseCollections({ 0: { name: 'Bridal' } })).toBeNull();
  });

  it('reads an empty array as an empty list, not as a malformed one', () => {
    // The difference matters: null means "fall back", and the fallback is also empty, so the
    // two are indistinguishable to a reader that does not check. They must not be the same
    // value, because saving an empty list is how an owner deletes their last collection.
    expect(parseCollections([])).toEqual([]);
  });

  it('keeps a well-formed entry exactly as written', () => {
    const parsed = parseCollections([
      {
        id: 'c-1',
        slug: 'bridal',
        name: 'Bridal',
        blurb: 'For the aisle.',
        image: '/collection/1.png',
        productIds: ['p1', 'p2'],
        visible: true,
      },
    ]);
    expect(parsed).toEqual([
      {
        id: 'c-1',
        slug: 'bridal',
        name: 'Bridal',
        blurb: 'For the aisle.',
        image: '/collection/1.png',
        productIds: ['p1', 'p2'],
        visible: true,
      },
    ]);
  });

  it('drops an entry with no name rather than drawing a nameless tile', () => {
    const parsed = parseCollections([
      { name: '   ', productIds: ['p1'] },
      { name: 'Festive' },
      { blurb: 'A collection with no name at all' },
      { name: 42 },
      'Bridal',
      null,
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed?.[0].name).toBe('Festive');
  });

  it('cannot invent a collection: nothing comes out that did not go in', () => {
    expect(parseCollections([{}, { blurb: 'x' }, { image: '/a.png' }])).toEqual([]);
    expect(DEFAULT_COLLECTIONS).toEqual([]);
  });

  it('coerces a missing blurb, picture and product list instead of refusing the entry', () => {
    const parsed = parseCollections([{ name: 'Festive' }]);
    expect(parsed?.[0]).toMatchObject({
      name: 'Festive',
      blurb: '',
      image: '',
      productIds: [],
    });
  });

  it('keeps the rest of the list when one entry has a nonsense field', () => {
    const parsed = parseCollections([
      { name: 'Bridal', visible: 'yes', productIds: 'p1', blurb: 7 },
      { name: 'Festive', productIds: ['p2'] },
    ]);
    expect(parsed).toHaveLength(2);
    expect(parsed?.[0]).toMatchObject({ visible: true, productIds: [], blurb: '' });
    expect(parsed?.[1].productIds).toEqual(['p2']);
  });

  it('hides a collection only on an explicit false', () => {
    const parsed = parseCollections([
      { name: 'A', visible: false },
      { name: 'B' },
      { name: 'C', visible: 0 },
      { name: 'D', visible: true },
    ]);
    expect(parsed?.map(collection => collection.visible)).toEqual([false, true, true, true]);
  });

  it('derives a slug from the name when none is stored', () => {
    const parsed = parseCollections([{ name: 'Everyday Luxe' }]);
    expect(parsed?.[0].slug).toBe('everyday-luxe');
  });

  it('keeps a stored slug through a rename, so a published link survives', () => {
    const parsed = parseCollections([{ slug: 'festive', name: 'Festive Edit 2026' }]);
    expect(parsed?.[0].slug).toBe('festive');
  });

  it('cleans a hand-edited slug rather than letting it into a route', () => {
    const parsed = parseCollections([{ slug: 'Not A/Slug ', name: 'Bridal' }]);
    expect(parsed?.[0].slug).toBe('not-a-slug');
  });

  it('can never return two collections with the same slug', () => {
    const parsed = parseCollections([
      { name: 'Festive' },
      { name: 'Festive' },
      { name: 'festive' },
      { slug: 'festive', name: 'Something else' },
    ]);
    const slugs = parsed?.map(collection => collection.slug);
    expect(slugs).toEqual(['festive', 'festive-2', 'festive-3', 'festive-4']);
    expect(new Set(slugs).size).toBe(slugs?.length);
  });

  it('gives the first occurrence the bare slug, so adding a duplicate cannot move a URL', () => {
    const before = parseCollections([{ id: 'a', name: 'Festive' }]);
    const after = parseCollections([
      { id: 'a', name: 'Festive' },
      { id: 'b', name: 'Festive' },
    ]);
    expect(after?.[0].slug).toBe(before?.[0].slug);
  });

  it('falls back to a usable slug for a name in a non-Latin script', () => {
    const parsed = parseCollections([{ id: 'wedding-2026', name: 'लहंगा' }, { name: 'साड़ी' }]);
    expect(parsed?.[0].slug).toBe('wedding-2026');
    expect(parsed?.[1].slug).toBe('collection-2');
    expect(parsed?.every(collection => collection.slug !== '')).toBe(true);
  });

  it('gives an entry an id when the stored one is missing, so React keys stay stable', () => {
    const parsed = parseCollections([{ name: 'A' }, { name: 'B' }]);
    expect(parsed?.map(collection => collection.id)).toEqual(['c0', 'c1']);
  });

  it('can never return two collections with the same id', () => {
    const parsed = parseCollections([
      { id: 'same', name: 'A' },
      { id: 'same', name: 'B' },
    ]);
    expect(parsed?.map(collection => collection.id)).toEqual(['same', 'same-2']);
  });

  it('lists a garment at most once, however many times it was stored', () => {
    const parsed = parseCollections([
      { name: 'Bridal', productIds: ['p1', 'p1', ' ', 'p2', '', null, 7, 'p1'] },
    ]);
    expect(parsed?.[0].productIds).toEqual(['p1', 'p2']);
  });

  it('keeps the stored order of both the collections and their garments', () => {
    const parsed = parseCollections([
      { name: 'Second', productIds: ['p3', 'p1'] },
      { name: 'First' },
    ]);
    expect(parsed?.map(collection => collection.name)).toEqual(['Second', 'First']);
    expect(parsed?.[0].productIds).toEqual(['p3', 'p1']);
  });

  it('round-trips its own output unchanged, so a save cannot drift from a read', () => {
    const once = parseCollections([
      { name: 'Bridal', productIds: ['p1'] },
      { name: 'Bridal', visible: false },
    ]);
    expect(parseCollections(once)).toEqual(once);
  });

  it('round-trips its own defaults unchanged', () => {
    expect(parseCollections(DEFAULT_COLLECTIONS)).toEqual(DEFAULT_COLLECTIONS);
  });
});

describe('visibleCollections', () => {
  it('keeps the hidden ones out of the strip without reordering the rest', () => {
    const parsed =
      parseCollections([{ name: 'A' }, { name: 'B', visible: false }, { name: 'C' }]) ?? [];
    expect(visibleCollections(parsed).map(collection => collection.name)).toEqual(['A', 'C']);
  });
});
