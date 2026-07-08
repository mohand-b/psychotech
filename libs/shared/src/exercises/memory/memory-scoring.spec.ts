import { describe, expect, it } from 'vitest';
import { MemorySequenceAnswerDto } from '../../dtos/session';
import { MemoryPhase } from '../../enums';
import { MemorySequence } from './memory-sequence';
import { scoreMemorySession } from './memory-scoring';

function sequence(
  index: number,
  phase: MemoryPhase,
  elements: number[],
): MemorySequence {
  return { index, phase, length: elements.length, elements };
}

function restitution(
  index: number,
  input: number[],
  timedOut = false,
): MemorySequenceAnswerDto {
  return { index, input, timeMs: 10_000, timedOut };
}

const NORMAL_TARGET_7149 = sequence(0, MemoryPhase.NORMAL, [7, 1, 4, 9]);

describe('scoreMemorySession', () => {
  it('credits full placement, partial placement and absence per position', () => {
    const scored = scoreMemorySession(
      [NORMAL_TARGET_7149],
      [restitution(0, [7, 4, 1, 9])],
    );
    expect(scored.results[0].positionStates).toEqual([
      'PLACED',
      'MISPLACED',
      'MISPLACED',
      'PLACED',
    ]);
    expect(scored.results[0].sequenceScore).toBeCloseTo(2.6 / 4, 10);
  });

  it('never credits a repeated digit twice when the target holds it once', () => {
    const scored = scoreMemorySession(
      [sequence(0, MemoryPhase.NORMAL, [5, 3, 8])],
      [restitution(0, [3, 3, 9])],
    );
    expect(scored.results[0].positionStates).toEqual([
      'ABSENT',
      'PLACED',
      'ABSENT',
    ]);
  });

  it('pairs well-placed digits before crediting misplaced ones', () => {
    const scored = scoreMemorySession(
      [sequence(0, MemoryPhase.NORMAL, [2, 2, 5])],
      [restitution(0, [2, 5, 2])],
    );
    expect(scored.results[0].positionStates).toEqual([
      'PLACED',
      'MISPLACED',
      'MISPLACED',
    ]);
  });

  it('evaluates inverse sequences against the reversed target', () => {
    const scored = scoreMemorySession(
      [sequence(0, MemoryPhase.INVERSE, [1, 2, 3, 4])],
      [restitution(0, [4, 3, 2, 1])],
    );
    expect(scored.results[0].positionStates).toEqual([
      'PLACED',
      'PLACED',
      'PLACED',
      'PLACED',
    ]);
    expect(scored.results[0].status).toBe('PERFECT');
  });

  it('marks a timed out sequence as such and leaves unfilled positions empty', () => {
    const scored = scoreMemorySession(
      [sequence(0, MemoryPhase.NORMAL, [1, 2, 3, 4, 5])],
      [restitution(0, [1, 2], true)],
    );
    expect(scored.results[0].status).toBe('TIMED_OUT');
    expect(scored.results[0].positionStates).toEqual([
      'PLACED',
      'PLACED',
      'EMPTY',
      'EMPTY',
      'EMPTY',
    ]);
    expect(scored.results[0].sequenceScore).toBeCloseTo(2 / 5, 10);
    expect(scored.timedOutCount).toBe(1);
  });

  it('weights the session score 40/60 between normal and inverse phases', () => {
    const sequences = [
      sequence(0, MemoryPhase.NORMAL, [1, 2, 3, 4]),
      sequence(1, MemoryPhase.NORMAL, [5, 6, 7, 8, 9]),
      sequence(2, MemoryPhase.NORMAL, [1, 3, 5, 7, 9, 2]),
      sequence(3, MemoryPhase.INVERSE, [2, 4, 6, 8]),
      sequence(4, MemoryPhase.INVERSE, [9, 7, 5, 3, 1]),
    ];
    const perfect = sequences.map((entry) =>
      restitution(
        entry.index,
        entry.phase === MemoryPhase.INVERSE
          ? [...entry.elements].reverse()
          : [...entry.elements],
      ),
    );
    const allPerfect = scoreMemorySession(sequences, perfect);
    expect(allPerfect.score).toBe(100);
    expect(allPerfect.perfectCount).toBe(5);
    expect(allPerfect.perfectNormalCount).toBe(3);
    expect(allPerfect.perfectInverseCount).toBe(2);

    const inverseOnly = scoreMemorySession(sequences, perfect.slice(3));
    expect(inverseOnly.score).toBe(60);

    const nothing = scoreMemorySession(sequences, []);
    expect(nothing.score).toBe(0);
    expect(nothing.restitutedPct).toBe(0);
  });

  it('computes restituted and placed percentages over all positions', () => {
    const scored = scoreMemorySession(
      [NORMAL_TARGET_7149],
      [restitution(0, [7, 4, 1, 9])],
    );
    expect(scored.restitutedPct).toBe(100);
    expect(scored.placedPct).toBe(50);
    expect(scored.misplacedCount).toBe(2);
    expect(scored.absentCount).toBe(0);
  });

  it('measures reliability per position excluding shorter sequences from the denominator', () => {
    const sequences = [
      sequence(0, MemoryPhase.NORMAL, [1, 2, 3, 4]),
      sequence(1, MemoryPhase.NORMAL, [5, 6, 7, 8, 9]),
    ];
    const scored = scoreMemorySession(sequences, [
      restitution(0, [1, 0, 3, 4]),
      restitution(1, [5, 6, 0, 8, 9]),
    ]);
    expect(scored.positionReliability).toEqual([100, 50, 50, 100, 100]);
  });
});
