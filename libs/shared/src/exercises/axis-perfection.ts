import { DiscriminationSessionScore } from './discrimination/discrimination-scoring';
import { LogicSessionScore } from './logic/logic-scoring';
import { MemorySessionScore } from './memory/memory-scoring';
import { MemorySequence } from './memory/memory-sequence';
import { ReactivitySessionScore } from './reactivity/reactivity-scoring';

export const MEMORY_PERFECTION_SEQUENCE_LENGTH = 8;

export function logicPerfectionAchieved(scored: LogicSessionScore): boolean {
  return (
    scored.statuses.length > 0 &&
    scored.statuses.every((status) => status === 'CORRECT')
  );
}

export function memoryPerfectionAchieved(
  sequences: MemorySequence[],
  scored: MemorySessionScore,
): boolean {
  return sequences.some(
    (sequence, position) =>
      sequence.length >= MEMORY_PERFECTION_SEQUENCE_LENGTH &&
      scored.results[position]?.status === 'PERFECT',
  );
}

export function discriminationPerfectionAchieved(
  scored: DiscriminationSessionScore,
): boolean {
  return (
    scored.outcomes.length > 0 &&
    scored.outcomes.every(
      (outcome) => outcome === 'TRUE_POSITIVE' || outcome === 'TRUE_NEGATIVE',
    )
  );
}

export function reactivityPerfectionAchieved(
  scored: ReactivitySessionScore,
): boolean {
  return (
    scored.classifications.length > 0 &&
    scored.anticipationCount === 0 &&
    scored.omissionCount === 0 &&
    scored.wrongCommandCount === 0
  );
}

export interface MotricityPerfectionCourse {
  progressionPct: number;
  majorErrors: number;
}

export function motricityPerfectionAchieved(
  courses: MotricityPerfectionCourse[],
): boolean {
  return (
    courses.length > 0 &&
    courses.every(
      (course) => course.progressionPct >= 100 && course.majorErrors === 0,
    )
  );
}
