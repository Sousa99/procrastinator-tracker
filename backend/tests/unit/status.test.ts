import { describe, expect, it } from 'vitest';
import { TRANSITIONS, isValidTransition, isTaskStatus } from '../../src/domain/status';

describe('status transition matrix', () => {
  it('covers every task status', () => {
    expect(Object.keys(TRANSITIONS).sort()).toEqual(
      ['in-progress', 'on-hold', 'started', 'to-start', 'validating', 'finished'].sort(),
    );
  });

  it('allows the happy path to-start -> started -> in-progress -> validating -> finished', () => {
    expect(isValidTransition('to-start', 'started')).toBe(true);
    expect(isValidTransition('started', 'in-progress')).toBe(true);
    expect(isValidTransition('in-progress', 'validating')).toBe(true);
    expect(isValidTransition('validating', 'finished')).toBe(true);
  });

  it('allows on-hold from started and in-progress', () => {
    expect(isValidTransition('started', 'on-hold')).toBe(true);
    expect(isValidTransition('in-progress', 'on-hold')).toBe(true);
  });

  it('allows reopening a finished task to started', () => {
    expect(isValidTransition('finished', 'started')).toBe(true);
  });

  it('allows reverting to an earlier status', () => {
    expect(isValidTransition('started', 'to-start')).toBe(true);
    expect(isValidTransition('in-progress', 'started')).toBe(true);
    expect(isValidTransition('validating', 'in-progress')).toBe(true);
  });

  it('rejects invalid edges', () => {
    expect(isValidTransition('to-start', 'finished')).toBe(false);
    expect(isValidTransition('to-start', 'validating')).toBe(false);
    expect(isValidTransition('started', 'finished')).toBe(false);
    expect(isValidTransition('to-start', 'on-hold')).toBe(false);
    expect(isValidTransition('validating', 'on-hold')).toBe(false);
  });

  it('rejects self-transitions as non-progress', () => {
    expect(isValidTransition('started', 'started')).toBe(false);
  });

  it('recognizes valid status strings only', () => {
    expect(isTaskStatus('finished')).toBe(true);
    expect(isTaskStatus('done')).toBe(false);
  });
});
