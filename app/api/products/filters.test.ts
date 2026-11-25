// The two query parameters `/api/products` grew for the admin catalogue. No database, no
// Prisma: these are the defaults, and the defaults are the dangerous part — this endpoint
// answers the public storefront as well as the portal.
import { describe, expect, it } from 'vitest';
import { ARCHIVED_MODES, archivedMode, archivedWhere, productTypeFromParam } from './filters';

describe('?archived=', () => {
  it('defaults to live products when the parameter is absent', () => {
    // The storefront sends no `archived` parameter at all, and must never be handed a garment
    // the shop has taken down. This single assertion is the public contract.
    expect(archivedMode(null)).toBe('live');
    expect(archivedMode(undefined)).toBe('live');
    expect(archivedWhere(null)).toEqual({ isArchived: false });
  });

  it('treats an empty parameter as absent', () => {
    // `?archived=` is what a select left at its default would send if it were ever wired
    // straight through. It must not mean "everything".
    expect(archivedWhere('')).toEqual({ isArchived: false });
    expect(archivedWhere('   ')).toEqual({ isArchived: false });
  });

  it('reads the three modes the admin sends', () => {
    expect(archivedMode('live')).toBe('live');
    expect(archivedMode('archived')).toBe('archived');
    expect(archivedMode('all')).toBe('all');
  });

  it('accepts the boolean spellings a hand-written URL would use', () => {
    expect(archivedMode('true')).toBe('archived');
    expect(archivedMode('ARCHIVED')).toBe('archived');
    expect(archivedMode('All')).toBe('all');
  });

  it('falls back to live on anything unrecognised rather than failing', () => {
    // A typo in a URL should show the live catalogue, not a 400 on the shop's listing page.
    expect(archivedMode('yes')).toBe('live');
    expect(archivedMode('archvied')).toBe('live');
    expect(archivedWhere('nonsense')).toEqual({ isArchived: false });
  });

  it('constrains nothing for `all`, so "everything" is the absence of a filter', () => {
    expect(archivedWhere('all')).toEqual({});
    expect('isArchived' in archivedWhere('all')).toBe(false);
  });

  it('asks for the archived half only when asked', () => {
    expect(archivedWhere('archived')).toEqual({ isArchived: true });
  });

  it('exposes exactly the three modes', () => {
    expect([...ARCHIVED_MODES]).toEqual(['live', 'archived', 'all']);
  });
});

describe('?category=', () => {
  it('accepts the database enum', () => {
    expect(productTypeFromParam('SAREE')).toBe('SAREE');
    expect(productTypeFromParam('KURTA_PANT')).toBe('KURTA_PANT');
    expect(productTypeFromParam('saree')).toBe('SAREE');
  });

  it("accepts the shop's own label, which is what the admin table displays", () => {
    // `Product.category` is `SAREE` in the database and 'Sarees' by the time a row renders, so
    // a filter that understood only one of the two would be one mapping call from matching
    // nothing at all.
    expect(productTypeFromParam('Sarees')).toBe('SAREE');
    expect(productTypeFromParam('Indo-Western')).toBe('INDO_WESTERN');
    expect(productTypeFromParam('Kurta Pant')).toBe('KURTA_PANT');
    expect(productTypeFromParam('Other')).toBe('OTHER');
  });

  it('is null for no category, which is how "Every category" is sent', () => {
    expect(productTypeFromParam('')).toBeNull();
    expect(productTypeFromParam('  ')).toBeNull();
    expect(productTypeFromParam(null)).toBeNull();
    expect(productTypeFromParam(undefined)).toBeNull();
  });

  it('is null for a category that does not exist, rather than guessing one', () => {
    // Guessing here would silently list the wrong garments, which is worse than listing all.
    expect(productTypeFromParam('Shoes')).toBeNull();
    expect(productTypeFromParam('SAREES')).toBeNull();
  });
});
