import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CATEGORY_TILES,
  DEFAULT_TESTIMONIALS,
  parseCategoryTiles,
  parseTestimonials,
} from './showcase';

/**
 * These two parsers stand between a JSON column and the public homepage, so what they refuse
 * matters more than what they accept. The cases below are the ones that would show on the
 * shop's front page if they were wrong: an empty quote card, a category tile that links
 * nowhere, or a section that vanishes because a row was malformed.
 */

describe('parseTestimonials', () => {
  it('refuses anything that is not an array, so the caller can fall back to the defaults', () => {
    expect(parseTestimonials(null)).toBeNull();
    expect(parseTestimonials(undefined)).toBeNull();
    expect(parseTestimonials('[]')).toBeNull();
    expect(parseTestimonials({ 0: { message: 'hi' } })).toBeNull();
  });

  it('keeps a well-formed entry exactly as written', () => {
    const parsed = parseTestimonials([
      { id: 'a', name: 'Meera', message: 'A beautiful lehenga.', image: '/t/1.png', rating: 4 },
    ]);
    expect(parsed).toEqual([
      { id: 'a', name: 'Meera', message: 'A beautiful lehenga.', image: '/t/1.png', rating: 4 },
    ]);
  });

  it('drops an entry with no quote rather than drawing a blank card', () => {
    const parsed = parseTestimonials([
      { message: '   ' },
      { message: 'Real quote.' },
      { name: 'No quote here' },
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed?.[0].message).toBe('Real quote.');
  });

  it('clamps a rating into 1–5 instead of refusing the entry', () => {
    const parsed = parseTestimonials([
      { message: 'a', rating: 9 },
      { message: 'b', rating: 0 },
      { message: 'c', rating: 3.4 },
      { message: 'd' },
      { message: 'e', rating: 'lots' },
    ]);
    expect(parsed?.map(item => item.rating)).toEqual([5, 1, 3, 5, 5]);
  });

  it('gives an entry an id when the stored one is missing, so React keys stay stable', () => {
    const parsed = parseTestimonials([{ message: 'a' }, { message: 'b' }]);
    expect(parsed?.map(item => item.id)).toEqual(['t0', 't1']);
  });

  it('round-trips its own defaults unchanged', () => {
    expect(parseTestimonials(DEFAULT_TESTIMONIALS)).toEqual(DEFAULT_TESTIMONIALS);
  });
});

describe('parseCategoryTiles', () => {
  const names = DEFAULT_CATEGORY_TILES.map(tile => tile.name);

  it('refuses anything that is not an array', () => {
    expect(parseCategoryTiles(null)).toBeNull();
    expect(parseCategoryTiles({})).toBeNull();
  });

  it('refuses a list naming no category it recognises, rather than returning nothing', () => {
    expect(parseCategoryTiles([{ name: 'Hats' }, { name: '' }])).toBeNull();
  });

  it('cannot invent a category that is not in the enum', () => {
    const parsed = parseCategoryTiles([
      { name: names[0] },
      { name: 'Swimwear', image: '/x.jpg' },
    ]);
    expect(parsed?.map(tile => tile.name).sort()).toEqual([...names].sort());
    expect(parsed?.some(tile => tile.name === 'Swimwear')).toBe(false);
  });

  it('takes the stored order and appends anything the stored list forgot', () => {
    const parsed = parseCategoryTiles([{ name: names[3] }, { name: names[1] }]);
    expect(parsed?.[0].name).toBe(names[3]);
    expect(parsed?.[1].name).toBe(names[1]);
    expect(parsed).toHaveLength(names.length);
  });

  it('applies a stored picture and visibility, and keeps the default otherwise', () => {
    const parsed = parseCategoryTiles([{ name: names[0], image: '/new.jpg', visible: false }]);
    const changed = parsed?.find(tile => tile.name === names[0]);
    const untouched = parsed?.find(tile => tile.name === names[1]);

    expect(changed?.image).toBe('/new.jpg');
    expect(changed?.visible).toBe(false);
    expect(untouched?.image).toBe(DEFAULT_CATEGORY_TILES[1].image);
    expect(untouched?.visible).toBe(true);
  });

  it('keeps the default picture when the stored one is blank', () => {
    const parsed = parseCategoryTiles([{ name: names[0], image: '   ' }]);
    expect(parsed?.find(tile => tile.name === names[0])?.image).toBe(
      DEFAULT_CATEGORY_TILES[0].image
    );
  });

  it('ignores a duplicate so one tile cannot appear twice on the homepage', () => {
    const parsed = parseCategoryTiles([{ name: names[0] }, { name: names[0] }]);
    expect(parsed?.filter(tile => tile.name === names[0])).toHaveLength(1);
  });

  it('keeps every tile pointing at a real ProductType', () => {
    const parsed = parseCategoryTiles(DEFAULT_CATEGORY_TILES);
    for (const tile of parsed ?? []) {
      expect(tile.type).not.toBe('OTHER');
    }
  });
});
