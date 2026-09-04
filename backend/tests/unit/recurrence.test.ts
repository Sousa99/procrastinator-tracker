import { describe, expect, it } from 'vitest';
import { addInterval, nextOccurrence } from '../../src/services/recurrence';

describe('recurrence occurrence computation', () => {
  const anchor = new Date('2026-09-01T00:00:00.000Z');

  it('computes daily intervals', () => {
    expect(addInterval(anchor, 'daily', 1).toISOString()).toBe('2026-09-02T00:00:00.000Z');
    expect(addInterval(anchor, 'daily', 3).toISOString()).toBe('2026-09-04T00:00:00.000Z');
  });

  it('computes weekly intervals', () => {
    expect(addInterval(anchor, 'weekly', 1).toISOString()).toBe('2026-09-08T00:00:00.000Z');
  });

  it('computes monthly intervals', () => {
    expect(addInterval(anchor, 'monthly', 1).toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });

  it('exposes nextOccurrence as the anchored interval step', () => {
    expect(nextOccurrence(anchor, 'daily', 2).toISOString()).toBe('2026-09-03T00:00:00.000Z');
  });
});
