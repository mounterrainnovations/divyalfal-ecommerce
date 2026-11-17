import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('test harness', () => {
  it('runs and resolves the @/ alias', () => {
    expect(cn('a', 'b')).toBe('a b');
  });
});
