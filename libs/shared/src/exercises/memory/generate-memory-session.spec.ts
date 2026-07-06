import { describe, expect, it } from 'vitest';
import { AXIS_TRAINING } from '../../domain';
import { AxisType, MemoryPhase } from '../../enums';
import { generateMemorySession } from './generate-memory-session';
import { expectedMemoryAnswer } from './memory-sequence';

const MEMORY_TRAINING = AXIS_TRAINING[AxisType.MEMORY];
const SAMPLE_SEEDS = ['memory-1', 'memory-2', 'memory-3', 'memory-4', 'memory-5'];

describe('generateMemorySession', () => {
  it('returns a strictly identical session for the same seed', () => {
    const first = generateMemorySession('determinism-seed');
    const second = generateMemorySession('determinism-seed');
    expect(second).toEqual(first);
  });

  it('matches the reference snapshot for a fixed seed', () => {
    expect(generateMemorySession('snapshot-seed')).toMatchSnapshot();
  });

  it('returns different sessions for different seeds', () => {
    expect(generateMemorySession('seed-a')).not.toEqual(generateMemorySession('seed-b'));
  });

  it('follows the shared training plan: 4, 5, 6 normal then 4, 5 inverse', () => {
    for (const seed of SAMPLE_SEEDS) {
      const sequences = generateMemorySession(seed);
      expect(sequences).toHaveLength(MEMORY_TRAINING.exerciseCount);
      expect(
        sequences.map(({ phase, length }) => ({ phase, length })),
      ).toEqual(MEMORY_TRAINING.sequences);
      expect(sequences.map(({ index }) => index)).toEqual([0, 1, 2, 3, 4]);
      for (const sequence of sequences) {
        expect(sequence.elements).toHaveLength(sequence.length);
      }
    }
  });

  it('draws digits between 0 and 9 without consecutive duplicates', () => {
    for (const seed of SAMPLE_SEEDS) {
      for (const sequence of generateMemorySession(seed)) {
        for (const [position, element] of sequence.elements.entries()) {
          expect(Number.isInteger(element)).toBe(true);
          expect(element).toBeGreaterThanOrEqual(0);
          expect(element).toBeLessThanOrEqual(9);
          if (position > 0) {
            expect(element).not.toBe(sequence.elements[position - 1]);
          }
        }
      }
    }
  });

  it('expects elements in order for the normal phase and reversed for the inverse phase', () => {
    expect(
      expectedMemoryAnswer({
        index: 0,
        phase: MemoryPhase.NORMAL,
        length: 4,
        elements: [3, 7, 1, 9],
      }),
    ).toEqual([3, 7, 1, 9]);
    expect(
      expectedMemoryAnswer({
        index: 3,
        phase: MemoryPhase.INVERSE,
        length: 4,
        elements: [3, 7, 1, 9],
      }),
    ).toEqual([9, 1, 7, 3]);
    for (const seed of SAMPLE_SEEDS) {
      for (const sequence of generateMemorySession(seed)) {
        const answer = expectedMemoryAnswer(sequence);
        expect(answer).toHaveLength(sequence.length);
        expect([...answer].sort()).toEqual([...sequence.elements].sort());
      }
    }
  });
});
