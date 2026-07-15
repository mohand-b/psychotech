import { AXIS_TRAINING, ReactivityTraining } from '../../domain';
import { AxisType } from '../../enums';
import { SeededRng, createSeededRng } from '../rng';
import {
  ReactivityStimulus,
  ReactivityStimulusPosition,
  ReactivityStimulusType,
} from './reactivity-stimulus';

export const REACTIVITY_MAX_SAME_TYPE_RUN = 3;
export const REACTIVITY_MIN_POSITION_DISTANCE = 0.6;

const POSITION_PRECISION = 1000;

function phasePool(
  appearAtMs: number,
  phaseDurationMs: number,
): ReactivityStimulusType[] {
  if (appearAtMs < phaseDurationMs) {
    return ['YELLOW'];
  }
  if (appearAtMs < 2 * phaseDurationMs) {
    return ['YELLOW', 'BLUE'];
  }
  return ['YELLOW', 'BLUE', 'RED'];
}

function drawType(
  rng: SeededRng,
  pool: ReactivityStimulusType[],
  previous: ReactivityStimulusType[],
): ReactivityStimulusType {
  const run = previous.slice(-REACTIVITY_MAX_SAME_TYPE_RUN);
  const forbidden =
    run.length === REACTIVITY_MAX_SAME_TYPE_RUN &&
    run.every((type) => type === run[0])
      ? run[0]
      : null;
  const allowed = pool.filter((type) => type !== forbidden);
  return rng.pick(allowed.length > 0 ? allowed : pool);
}

function drawCoordinate(rng: SeededRng): number {
  return (
    Math.round((rng.next() * 2 - 1) * POSITION_PRECISION) / POSITION_PRECISION
  );
}

function distance(
  a: ReactivityStimulusPosition,
  b: ReactivityStimulusPosition,
): number {
  return Math.hypot(a.fx - b.fx, a.fy - b.fy);
}

function drawPosition(
  rng: SeededRng,
  previous: ReactivityStimulusPosition | null,
): ReactivityStimulusPosition {
  let candidate: ReactivityStimulusPosition;
  do {
    candidate = { fx: drawCoordinate(rng), fy: drawCoordinate(rng) };
  } while (
    previous !== null &&
    distance(candidate, previous) < REACTIVITY_MIN_POSITION_DISTANCE
  );
  return candidate;
}

export function generateReactivitySession(
  seed: string,
  training: ReactivityTraining = AXIS_TRAINING[AxisType.REACTIVITY],
): ReactivityStimulus[] {
  const rng = createSeededRng(seed);
  const totalMs = training.timer.durationSec * 1000;
  const phaseDurationMs = training.phaseDurationSec * 1000;
  const stimuli: ReactivityStimulus[] = [];
  const types: ReactivityStimulusType[] = [];
  let previousPosition: ReactivityStimulusPosition | null = null;
  let appearAtMs = rng.nextInt(training.isiMinMs, training.isiMaxMs);
  while (appearAtMs + training.responseWindowMs <= totalMs) {
    const type = drawType(rng, phasePool(appearAtMs, phaseDurationMs), types);
    const position = drawPosition(rng, previousPosition);
    stimuli.push({ index: stimuli.length, type, appearAtMs, position });
    types.push(type);
    previousPosition = position;
    appearAtMs += rng.nextInt(training.isiMinMs, training.isiMaxMs);
  }
  return stimuli;
}
