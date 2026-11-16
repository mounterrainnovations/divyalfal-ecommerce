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

  it('guards every animation behind prefers-reduced-motion', () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });
});
