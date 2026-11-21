import { describe, expect, it } from 'vitest';
import { resolveSpan } from './resolveSpan';

describe('resolveSpan', () => {
  it('defaults to the full width', () => {
    expect(resolveSpan(undefined, 12)).toBe(12);
  });

  it('clamps to the grid', () => {
    expect(resolveSpan(99, 12)).toBe(12);
    expect(resolveSpan(-2, 12)).toBe(12);
    expect(resolveSpan(3, 12)).toBe(3);
  });
});
