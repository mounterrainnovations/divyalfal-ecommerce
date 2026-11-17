import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('app/globals.css', 'utf8');

describe('atelier design tokens', () => {
  it('declares the six palette tokens with the spec values', () => {
    for (const [token, value] of [
      ['--paper', '#FAF7F2'],
      ['--paper-deep', '#F1EBE1'],
      ['--ink', '#141210'],
      ['--ink-soft', '#6B635A'],
      ['--gold', '#A8873F'],
      ['--accent-sale', '#8C2F2F'],
    ])
      expect(css).toMatch(new RegExp(`${token}:\\s*${value}`, 'i'));
  });

  it('self-hosts both families and never fetches fonts at runtime', () => {
    expect(css).toMatch(/@font-face/);
    expect(css).toMatch(/Fraunces/);
    expect(css).toMatch(/Jost/);
    expect(css).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  });

  /**
   * **The section rhythm is one token, and the density pass moved it there rather than into
   * eight sections.**
   *
   * The editorial pacing was drawn for lush photography and a full catalogue: 160px above and
   * below every movement. At this inventory — eleven photographs and two products on the whole
   * homepage — it read as vast empty paper, which is what the owner saw. 104px desktop is the
   * tightened figure; 80px replaces the 96px mobile value, tightened in the same proportion
   * (0.65 and 0.83 of what they were), because the phone picks up six category photographs in
   * the same pass and needed the room back.
   *
   * Pinned here because `section-rhythm` is the only vertical rhythm on the storefront: every
   * movement, the contact form, the store map and the footer's top padding read this one
   * value, so changing it is a whole-site decision and must not happen by accident.
   */
  it('sets one section rhythm for the whole storefront: 80px, 104px from lg', () => {
    expect(css).toMatch(/--section-rhythm:\s*80px/);
    expect(css).toMatch(/@media\s*\(min-width:\s*1024px\)[\s\S]*?--section-rhythm:\s*104px/);
    // The pre-density figures, which no longer appear as a rhythm anywhere.
    expect(css).not.toMatch(/--section-rhythm:\s*(?:96|160)px/);
  });

  it('guards every animation behind prefers-reduced-motion', () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });
});
