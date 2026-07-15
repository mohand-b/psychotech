import { describe, expect, it } from 'vitest';
import { MemoryPhase, RecommendationPriority } from '../../enums';
import { analyzeMemory } from './memory-findings';
import { MemorySequence } from './memory-sequence';
import {
  MemorySequenceResult,
  MemorySequenceStatus,
  MemorySessionScore,
} from './memory-scoring';

function sequence(
  index: number,
  length: number,
  phase: MemoryPhase = MemoryPhase.NORMAL,
): MemorySequence {
  return {
    index,
    phase,
    length,
    elements: Array.from({ length }, (_, position) => position + 1),
  };
}

function result(status: MemorySequenceStatus): MemorySequenceResult {
  return { status, positionStates: [], sequenceScore: status === 'PERFECT' ? 1 : 0.4 };
}

function score(overrides: Partial<MemorySessionScore>): MemorySessionScore {
  return {
    score: 70,
    results: [],
    perfectCount: 0,
    perfectNormalCount: 0,
    perfectInverseCount: 0,
    restitutedPct: 80,
    placedPct: 70,
    timedOutCount: 0,
    positionReliability: [],
    normalAvg: 0.8,
    inverseAvg: 0.8,
    misplacedCount: 0,
    absentCount: 0,
    ...overrides,
  };
}

describe('analyzeMemory', () => {
  it('flags the normal versus inverse gap with both percentages', () => {
    const findings = analyzeMemory(
      [],
      score({ normalAvg: 0.9, inverseAvg: 0.5 }),
    );
    const gap = findings.find(({ id }) => id === 'MEMORY_INVERSE_GAP');
    expect(gap).toBeDefined();
    expect(gap?.severity).toBe(RecommendationPriority.HIGH);
    expect(gap?.finding).toContain('90 %');
    expect(gap?.finding).toContain('50 %');
  });

  it('stays silent on the inverse gap when both orders align', () => {
    expect(
      analyzeMemory([], score({ normalAvg: 0.8, inverseAvg: 0.75 })).map(
        ({ id }) => id,
      ),
    ).not.toContain('MEMORY_INVERSE_GAP');
  });

  it('flags a length cliff when every longer sequence fails', () => {
    const sequences = [
      sequence(0, 4),
      sequence(1, 5),
      sequence(2, 6),
      sequence(3, 7),
    ];
    const findings = analyzeMemory(
      sequences,
      score({
        results: [
          result('PERFECT'),
          result('PERFECT'),
          result('FAILED'),
          result('FAILED'),
        ],
      }),
    );
    const cliff = findings.find(({ id }) => id === 'MEMORY_LENGTH_CLIFF');
    expect(cliff).toBeDefined();
    expect(cliff?.finding).toContain("jusqu'à 5 éléments");
  });

  it('stays silent on the cliff when a longer sequence still succeeds', () => {
    const sequences = [sequence(0, 4), sequence(1, 5), sequence(2, 6)];
    expect(
      analyzeMemory(
        sequences,
        score({
          results: [result('PERFECT'), result('FAILED'), result('PERFECT')],
        }),
      ).map(({ id }) => id),
    ).not.toContain('MEMORY_LENGTH_CLIFF');
  });

  it('distinguishes transpositions from intrusions', () => {
    const transpositions = analyzeMemory(
      [],
      score({ misplacedCount: 4, absentCount: 1 }),
    );
    expect(
      transpositions.find(({ id }) => id === 'MEMORY_TRANSPOSITIONS')?.finding,
    ).toContain('4 éléments retenus mais placés au mauvais rang');

    const intrusions = analyzeMemory(
      [],
      score({ misplacedCount: 1, absentCount: 4 }),
    );
    expect(
      intrusions.find(({ id }) => id === 'MEMORY_INTRUSIONS')?.finding,
    ).toContain("4 éléments saisis qui n'appartenaient pas");
  });

  it('stays silent on fault nature below the minimum volume or at equality', () => {
    expect(
      analyzeMemory([], score({ misplacedCount: 1, absentCount: 0 })).map(
        ({ id }) => id,
      ),
    ).not.toContain('MEMORY_TRANSPOSITIONS');
    expect(
      analyzeMemory([], score({ misplacedCount: 3, absentCount: 3 })).map(
        ({ id }) => id,
      ),
    ).toEqual(expect.not.arrayContaining(['MEMORY_TRANSPOSITIONS', 'MEMORY_INTRUSIONS']));
  });

  it('flags timed out restitutions', () => {
    const findings = analyzeMemory([], score({ timedOutCount: 2 }));
    expect(
      findings.find(({ id }) => id === 'MEMORY_TIMEOUTS')?.finding,
    ).toContain('2 restitutions hors délai');
  });
});
