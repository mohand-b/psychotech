import { AXIS_TRAINING } from '../../domain';
import { AxisType } from '../../enums';
import {
  ReactivityStimulusAnswerDto,
  ReactivityWaitPressDto,
} from '../../dtos/session';
import {
  REACTIVITY_COMMAND_BY_TYPE,
  ReactivityClassification,
  ReactivityStimulus,
} from './reactivity-stimulus';

export const REACTIVITY_ANTICIPATION_TR_MS = 150;
export const REACTIVITY_SPEED_WEIGHT = 0.5;
export const REACTIVITY_STABILITY_WEIGHT = 0.3;
export const REACTIVITY_ACCURACY_WEIGHT = 0.2;
export const REACTIVITY_SPEED_BEST_MS = 300;
export const REACTIVITY_SPEED_WORST_MS = 850;
export const REACTIVITY_STABILITY_BEST_MS = 25;
export const REACTIVITY_STABILITY_WORST_MS = 150;
export const REACTIVITY_TREND_WINDOW = 5;
export const REACTIVITY_PHASE_SD_MIN_VALID = 2;

export interface ReactivityStimulusPoint {
  appearAtMs: number;
  trMs: number | null;
  classification: ReactivityClassification;
}

export interface ReactivityTrendPoint {
  appearAtMs: number;
  trMs: number;
}

export interface ReactivitySessionScore {
  score: number;
  classifications: ReactivityClassification[];
  trMoyMs: number | null;
  sdMs: number | null;
  wrongCommandCount: number;
  anticipationCount: number;
  omissionCount: number;
  points: ReactivityStimulusPoint[];
  trend: ReactivityTrendPoint[];
}

function classify(
  stimulus: ReactivityStimulus,
  response: ReactivityStimulusAnswerDto | undefined,
): ReactivityClassification {
  if (!response || response.commandPressed === null) {
    return 'OMISSION';
  }
  if (response.trMs !== null && response.trMs < REACTIVITY_ANTICIPATION_TR_MS) {
    return 'ANTICIPATION';
  }
  return response.commandPressed === REACTIVITY_COMMAND_BY_TYPE[stimulus.type]
    ? 'VALID'
    : 'WRONG_COMMAND';
}

function scoreNorm(value: number, best: number, worst: number): number {
  return 100 * Math.min(1, Math.max(0, (worst - value) / (worst - best)));
}

export function scoreReactivitySession(
  sequence: ReactivityStimulus[],
  responses: ReactivityStimulusAnswerDto[],
  waitPresses: ReactivityWaitPressDto[],
): ReactivitySessionScore {
  const responseByIndex = new Map(
    responses.map((response) => [response.index, response]),
  );
  const points: ReactivityStimulusPoint[] = sequence.map((stimulus) => {
    const response = responseByIndex.get(stimulus.index);
    return {
      appearAtMs: stimulus.appearAtMs,
      trMs: response?.trMs ?? null,
      classification: classify(stimulus, response),
    };
  });
  const classifications = points.map(({ classification }) => classification);

  const validTimes = points
    .filter(
      ({ classification, trMs }) => classification === 'VALID' && trMs !== null,
    )
    .map(({ trMs }) => trMs as number);
  const trMoyMs =
    validTimes.length === 0
      ? null
      : validTimes.reduce((sum, value) => sum + value, 0) / validTimes.length;

  const phaseMs = AXIS_TRAINING[AxisType.REACTIVITY].phaseDurationSec * 1000;
  const validTimesByPhase = new Map<number, number[]>();
  for (const point of points) {
    if (point.classification !== 'VALID' || point.trMs === null) {
      continue;
    }
    const phase = Math.floor(point.appearAtMs / phaseMs);
    validTimesByPhase.set(phase, [
      ...(validTimesByPhase.get(phase) ?? []),
      point.trMs,
    ]);
  }
  const deviation = (values: number[]) => {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.sqrt(
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
        values.length,
    );
  };
  const computablePhases = [...validTimesByPhase.values()].filter(
    (times) => times.length >= REACTIVITY_PHASE_SD_MIN_VALID,
  );
  const computableCount = computablePhases.reduce(
    (sum, times) => sum + times.length,
    0,
  );
  const sdMs =
    computablePhases.length === 0
      ? null
      : computablePhases.reduce(
          (sum, times) => sum + deviation(times) * times.length,
          0,
        ) / computableCount;

  const wrongCommandCount = classifications.filter(
    (classification) => classification === 'WRONG_COMMAND',
  ).length;
  const stimulusAnticipations = classifications.filter(
    (classification) => classification === 'ANTICIPATION',
  ).length;
  const omissionCount = classifications.filter(
    (classification) => classification === 'OMISSION',
  ).length;
  const anticipationCount = stimulusAnticipations + waitPresses.length;

  const speed = trMoyMs === null
    ? 0
    : scoreNorm(trMoyMs, REACTIVITY_SPEED_BEST_MS, REACTIVITY_SPEED_WORST_MS);
  const stability =
    sdMs === null
      ? 0
      : scoreNorm(
          sdMs,
          REACTIVITY_STABILITY_BEST_MS,
          REACTIVITY_STABILITY_WORST_MS,
        );
  const errorRate =
    sequence.length === 0
      ? 100
      : ((anticipationCount + omissionCount + wrongCommandCount) /
          sequence.length) *
        100;
  const responseQuality =
    REACTIVITY_SPEED_WEIGHT * speed +
    REACTIVITY_STABILITY_WEIGHT * stability +
    REACTIVITY_ACCURACY_WEIGHT * 100;
  const score = Math.round(
    Math.min(100, Math.max(0, (responseQuality * (100 - errorRate)) / 100)),
  );

  const validPoints = points.filter(
    ({ classification, trMs }) => classification === 'VALID' && trMs !== null,
  );
  const half = Math.floor(REACTIVITY_TREND_WINDOW / 2);
  const trend: ReactivityTrendPoint[] = validPoints.map((point, position) => {
    const window = validPoints.slice(
      Math.max(0, position - half),
      Math.min(validPoints.length, position + half + 1),
    );
    return {
      appearAtMs: point.appearAtMs,
      trMs:
        window.reduce((sum, entry) => sum + (entry.trMs as number), 0) /
        window.length,
    };
  });

  return {
    score,
    classifications,
    trMoyMs: trMoyMs === null ? null : Math.round(trMoyMs),
    sdMs: sdMs === null ? null : Math.round(sdMs),
    wrongCommandCount,
    anticipationCount,
    omissionCount,
    points,
    trend,
  };
}
