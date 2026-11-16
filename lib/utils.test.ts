import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('keeps a custom text size alongside a text colour', () => {
    // tailwind-merge would otherwise read text-display-1 as a colour and drop it.
    for (const size of [
      'text-display-1',
      'text-display-2',
      'text-display-3',
      'text-body',
      'text-caption',
      'text-eyebrow',
    ]) {
      const merged = cn(size, 'text-ink').split(' ');
      expect(merged, size).toContain(size);
      expect(merged, size).toContain('text-ink');
    }
    expect(cn('text-eyebrow', 'text-ink-soft').split(' ')).toEqual(['text-eyebrow', 'text-ink-soft']);
  });

  it('still lets a later custom size replace an earlier one', () => {
    expect(cn('text-display-1', 'text-caption')).toBe('text-caption');
    expect(cn('text-sm', 'text-eyebrow')).toBe('text-eyebrow');
  });

  it('still lets a later colour replace an earlier colour', () => {
    expect(cn('text-ink', 'text-ink-soft')).toBe('text-ink-soft');
  });

  it('still merges ordinary conflicting utilities', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
