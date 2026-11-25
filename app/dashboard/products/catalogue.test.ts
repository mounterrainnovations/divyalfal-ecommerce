// The Products screen's query, header sentence and remembered view. Pure functions, no
// component, no network: what is checked here is the arithmetic an admin would otherwise have
// to trust — above all that a screen hiding archived products admits how many it is hiding.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ARCHIVED_FILTERS,
  CATEGORY_OPTIONS,
  DEFAULT_VIEW,
  buildProductQuery,
  describeShown,
  readView,
  storeView,
} from './catalogue';

const base = {
  page: 1,
  perPage: 20,
  sortBy: 'newest',
  order: 'desc',
  search: '',
  category: '',
  archived: 'live' as const,
};

describe('buildProductQuery', () => {
  it('always states the archive filter and asks for the counts', () => {
    // The screen's header cannot say "6 archived not shown" without `counts=1`, and the
    // endpoint's default would be live-only even if `archived` were dropped — but stating it
    // is what makes the URL in the network tab self-explanatory.
    const params = new URLSearchParams(buildProductQuery(base));
    expect(params.get('archived')).toBe('live');
    expect(params.get('counts')).toBe('1');
  });

  it('carries page, limit and the sort pair the endpoint understands', () => {
    const params = new URLSearchParams(
      buildProductQuery({ ...base, page: 3, sortBy: 'name', order: 'asc' })
    );
    expect(params.get('page')).toBe('3');
    expect(params.get('limit')).toBe('20');
    expect(params.get('sortBy')).toBe('name');
    expect(params.get('order')).toBe('asc');
  });

  it('omits an empty search and category rather than sending them empty', () => {
    const params = new URLSearchParams(buildProductQuery(base));
    expect(params.has('search')).toBe(false);
    expect(params.has('category')).toBe(false);
  });

  it('sends the search and category when they are set', () => {
    const params = new URLSearchParams(
      buildProductQuery({ ...base, search: 'silk saree', category: 'SAREE' })
    );
    expect(params.get('search')).toBe('silk saree');
    expect(params.get('category')).toBe('SAREE');
  });

  it('sends the archived filter the admin chose', () => {
    expect(new URLSearchParams(buildProductQuery({ ...base, archived: 'all' })).get('archived')).toBe(
      'all'
    );
    expect(
      new URLSearchParams(buildProductQuery({ ...base, archived: 'archived' })).get('archived')
    ).toBe('archived');
  });
});

describe('describeShown', () => {
  it('admits how many archived products are being held back', () => {
    // The whole reason this sentence exists: hiding rows silently would have an admin who
    // archived six garments open the catalogue, count eight, and conclude six had been lost.
    expect(
      describeShown({ shown: 8, counts: { live: 8, archived: 6 }, archived: 'live' })
    ).toBe('8 of 14 products · 6 archived not shown');
  });

  it('says nothing about the archive when nothing is archived', () => {
    expect(describeShown({ shown: 15, counts: { live: 15, archived: 0 }, archived: 'live' })).toBe(
      '15 of 15 products'
    );
  });

  it('names the matches rather than the catalogue while a filter is on', () => {
    // With a search in force the larger number is the number of matches, not the catalogue,
    // and letting it read as the catalogue would be the same lie in a different place.
    expect(
      describeShown({
        shown: 2,
        counts: { live: 2, archived: 1 },
        archived: 'live',
        filtered: true,
      })
    ).toBe('2 of 3 matching products · 1 archived not shown');
  });

  it('states what is hidden the other way round when listing the archive', () => {
    expect(
      describeShown({ shown: 6, counts: { live: 8, archived: 6 }, archived: 'archived' })
    ).toBe('6 products, archived · 8 live not shown');
  });

  it('says how many of a combined list are archived', () => {
    expect(describeShown({ shown: 14, counts: { live: 8, archived: 6 }, archived: 'all' })).toBe(
      '14 products, live and archived · 6 archived'
    );
  });

  it('falls back to what it knows when the counts could not be produced', () => {
    // The counts are gathered in a `try` of their own: the list matters more than the
    // arithmetic, and a missing count must cost one clause, not the sentence.
    expect(describeShown({ shown: 8, archived: 'live' })).toBe('8 products');
    expect(describeShown({ shown: 8, archived: 'archived' })).toBe('8 products, archived');
  });

  it('counts one product in the singular', () => {
    expect(describeShown({ shown: 1, archived: 'archived' })).toBe('1 product, archived');
    expect(describeShown({ shown: 1, counts: { live: 1, archived: 0 }, archived: 'live' })).toBe(
      '1 of 1 products'
    );
  });
});

describe('the filter options', () => {
  it('offers all seven categories, with the enum as the value', () => {
    // Derived from CATEGORY_MAPPING rather than listed again: a hand-written copy is how a
    // category goes missing from a filter and an admin concludes a garment has vanished.
    expect(CATEGORY_OPTIONS).toHaveLength(7);
    expect(CATEGORY_OPTIONS.map(option => option.value)).toEqual([
      'SAREE',
      'INDO_WESTERN',
      'LEHENGA',
      'SUIT',
      'KURTA_PANT',
      'WESTERN',
      'OTHER',
    ]);
    expect(CATEGORY_OPTIONS[0].label).toBe('Sarees');
  });

  it('offers live, archived and both, with live first', () => {
    expect(ARCHIVED_FILTERS.map(option => option.value)).toEqual(['live', 'archived', 'all']);
  });
});

describe('the remembered view', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('defaults to the table', () => {
    expect(DEFAULT_VIEW).toBe('table');
    expect(readView()).toBe('table');
  });

  it('remembers the grid once it has been chosen', () => {
    storeView('grid');
    expect(readView()).toBe('grid');
    storeView('table');
    expect(readView()).toBe('table');
  });

  it('survives a localStorage that throws on read', () => {
    // A private window and a site-data policy both make `localStorage` throw rather than
    // return null. A remembered preference is not worth a blank screen.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('access denied');
    });
    expect(readView()).toBe('table');
  });

  it('keeps the toggle working when localStorage refuses the write', () => {
    // A blocked store must not freeze the view on the default for the whole session: the
    // choice is kept in memory, and handed back to storage the moment it works again.
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(() => storeView('grid')).not.toThrow();
    expect(readView()).toBe('grid');

    setItem.mockRestore();
    storeView('table');
    expect(readView()).toBe('table');
  });

  it('ignores a stored value that is not a view', () => {
    localStorage.setItem('divyafal.admin.products.view', 'carousel');
    expect(readView()).toBe('table');
  });
});
