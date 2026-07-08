import { MemorySequenceAnswerDto } from '../../dtos/session';
import { MemoryPhase } from '../../enums';
import { MemorySequence, expectedMemoryAnswer } from './memory-sequence';

export type MemoryPositionState = 'PLACED' | 'MISPLACED' | 'ABSENT' | 'EMPTY';
export type MemorySequenceStatus = 'PERFECT' | 'FAILED' | 'TIMED_OUT';

export const MEMORY_PLACED_POINTS = 1;
export const MEMORY_MISPLACED_POINTS = 0.3;
export const MEMORY_NORMAL_PHASE_WEIGHT = 0.4;
export const MEMORY_INVERSE_PHASE_WEIGHT = 0.6;

export interface MemorySequenceResult {
  status: MemorySequenceStatus;
  positionStates: MemoryPositionState[];
  sequenceScore: number;
}

export interface MemorySessionScore {
  score: number;
  results: MemorySequenceResult[];
  perfectCount: number;
  perfectNormalCount: number;
  perfectInverseCount: number;
  restitutedPct: number;
  placedPct: number;
  timedOutCount: number;
  positionReliability: number[];
  normalAvg: number;
  inverseAvg: number;
  misplacedCount: number;
  absentCount: number;
}

function positionStatesFor(
  target: number[],
  input: number[],
): MemoryPositionState[] {
  const states: MemoryPositionState[] = target.map((expected, position) => {
    const entered = input[position];
    if (entered === undefined) {
      return 'EMPTY';
    }
    return entered === expected ? 'PLACED' : 'ABSENT';
  });
  const remaining = new Map<number, number>();
  target.forEach((expected, position) => {
    if (states[position] !== 'PLACED') {
      remaining.set(expected, (remaining.get(expected) ?? 0) + 1);
    }
  });
  states.forEach((state, position) => {
    if (state !== 'ABSENT') {
      return;
    }
    const entered = input[position];
    const available = remaining.get(entered) ?? 0;
    if (available > 0) {
      states[position] = 'MISPLACED';
      remaining.set(entered, available - 1);
    }
  });
  return states;
}

function pointsFor(state: MemoryPositionState): number {
  if (state === 'PLACED') {
    return MEMORY_PLACED_POINTS;
  }
  return state === 'MISPLACED' ? MEMORY_MISPLACED_POINTS : 0;
}

export function scoreMemorySession(
  sequences: MemorySequence[],
  restitutions: MemorySequenceAnswerDto[],
): MemorySessionScore {
  const restitutionByIndex = new Map(
    restitutions.map((restitution) => [restitution.index, restitution]),
  );
  const results: MemorySequenceResult[] = sequences.map((sequence) => {
    const restitution = restitutionByIndex.get(sequence.index);
    const target = expectedMemoryAnswer(sequence);
    const positionStates = positionStatesFor(target, restitution?.input ?? []);
    const sequenceScore =
      positionStates.reduce((sum, state) => sum + pointsFor(state), 0) /
      sequence.length;
    const status: MemorySequenceStatus = restitution?.timedOut
      ? 'TIMED_OUT'
      : positionStates.every((state) => state === 'PLACED')
        ? 'PERFECT'
        : 'FAILED';
    return { status, positionStates, sequenceScore };
  });

  const phaseAverage = (phase: MemoryPhase) => {
    const scores = sequences
      .map((sequence, position) => ({ sequence, result: results[position] }))
      .filter(({ sequence }) => sequence.phase === phase)
      .map(({ result }) => result.sequenceScore);
    return scores.length === 0
      ? 0
      : scores.reduce((sum, value) => sum + value, 0) / scores.length;
  };
  const normalAvg = phaseAverage(MemoryPhase.NORMAL);
  const inverseAvg = phaseAverage(MemoryPhase.INVERSE);
  const score = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        100 *
          (MEMORY_NORMAL_PHASE_WEIGHT * normalAvg +
            MEMORY_INVERSE_PHASE_WEIGHT * inverseAvg),
      ),
    ),
  );

  const allStates = results.flatMap((result) => result.positionStates);
  const totalPositions = allStates.length;
  const placedCount = allStates.filter((state) => state === 'PLACED').length;
  const misplacedCount = allStates.filter(
    (state) => state === 'MISPLACED',
  ).length;
  const absentCount = allStates.filter((state) => state === 'ABSENT').length;

  const maxLength = Math.max(0, ...sequences.map(({ length }) => length));
  const positionReliability = Array.from({ length: maxLength }, (_, position) => {
    const applicable = sequences
      .map((sequence, index) => ({ sequence, result: results[index] }))
      .filter(({ sequence }) => sequence.length > position);
    if (applicable.length === 0) {
      return 0;
    }
    const placed = applicable.filter(
      ({ result }) => result.positionStates[position] === 'PLACED',
    ).length;
    return Math.round((placed / applicable.length) * 100);
  });

  const isPerfect = (phase: MemoryPhase) =>
    sequences.filter(
      (sequence, index) =>
        sequence.phase === phase && results[index].status === 'PERFECT',
    ).length;

  return {
    score,
    results,
    perfectCount: results.filter(({ status }) => status === 'PERFECT').length,
    perfectNormalCount: isPerfect(MemoryPhase.NORMAL),
    perfectInverseCount: isPerfect(MemoryPhase.INVERSE),
    restitutedPct:
      totalPositions === 0
        ? 0
        : Math.round(((placedCount + misplacedCount) / totalPositions) * 100),
    placedPct:
      totalPositions === 0
        ? 0
        : Math.round((placedCount / totalPositions) * 100),
    timedOutCount: results.filter(({ status }) => status === 'TIMED_OUT').length,
    positionReliability,
    normalAvg,
    inverseAvg,
    misplacedCount,
    absentCount,
  };
}
