import { AXIS_TRAINING, MemoryTraining } from '../../domain';
import { AxisType } from '../../enums';
import { createSeededRng } from '../rng';
import { MemorySequence } from './memory-sequence';

export function generateMemorySession(
  seed: string,
  training: MemoryTraining = AXIS_TRAINING[AxisType.MEMORY],
): MemorySequence[] {
  const rng = createSeededRng(seed);
  return training.sequences.map((config, index) => {
    const elements: number[] = [];
    while (elements.length < config.length) {
      const digit = rng.nextInt(0, 9);
      if (elements.length > 0 && elements[elements.length - 1] === digit) {
        continue;
      }
      elements.push(digit);
    }
    return {
      index,
      phase: config.phase,
      length: config.length,
      elements,
    };
  });
}
