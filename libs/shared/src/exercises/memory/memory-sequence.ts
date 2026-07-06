import { MemoryPhase } from '../../enums';

export interface MemorySequence {
  index: number;
  phase: MemoryPhase;
  length: number;
  elements: number[];
}

export function expectedMemoryAnswer(sequence: MemorySequence): number[] {
  return sequence.phase === MemoryPhase.INVERSE
    ? [...sequence.elements].reverse()
    : [...sequence.elements];
}
