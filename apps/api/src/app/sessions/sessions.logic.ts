import { BadRequestException } from '@nestjs/common';
import {
  AXIS_TRAINING,
  AxisRawResultDto,
  AxisType,
  SessionMode,
} from '@psychotech/shared';
import { localDayNumber, previousLocalDayNumber } from '../common/timezone.util';

export const SESSION_HISTORY_PAGE_SIZE = 10;

export function finishedAxisCount(
  axisResults: { completedAt: Date | null; skipped: boolean }[],
): number {
  return axisResults.filter(
    (axis) => axis.completedAt !== null || axis.skipped,
  ).length;
}

export function targetedContentFullyPlayed(
  rawResult: AxisRawResultDto,
  playedMs: number | undefined,
): boolean {
  if (rawResult.axis === AxisType.LOGIC) {
    const training = AXIS_TRAINING[AxisType.LOGIC];
    const activeMs = rawResult.items.reduce(
      (sum, item) => sum + item.timeMs,
      0,
    );
    return (
      activeMs >= training.timer.durationSec * 1000 ||
      (rawResult.items.length === training.exerciseCount &&
        rawResult.items.every((item) => item.answerIndex !== null))
    );
  }
  if (rawResult.axis === AxisType.MEMORY) {
    return (
      rawResult.sequences.length ===
      AXIS_TRAINING[AxisType.MEMORY].exerciseCount
    );
  }
  if (rawResult.axis === AxisType.VISUAL_DISCRIMINATION) {
    const training = AXIS_TRAINING[AxisType.VISUAL_DISCRIMINATION];
    const activeMs = rawResult.trials.reduce(
      (sum, trial) => sum + trial.timeMs,
      0,
    );
    return (
      activeMs >= training.timer.durationSec * 1000 ||
      (rawResult.trials.length === training.exerciseCount &&
        rawResult.trials.every((trial) => trial.answer !== null))
    );
  }
  return (
    (playedMs ?? 0) >=
    AXIS_TRAINING[AxisType.REACTIVITY].timer.durationSec * 1000
  );
}

export function activePlayDurationSec(
  axisResults: { metrics: unknown }[],
): number {
  const totalMs = axisResults.reduce(
    (sum, axis) => sum + axisPlayTimeMs(axis.metrics),
    0,
  );
  return Math.round(totalMs / 1000);
}

function axisPlayTimeMs(metrics: unknown): number {
  const raw = metrics as AxisRawResultDto | null;
  if (!raw) {
    return 0;
  }
  if (raw.axis === AxisType.LOGIC && Array.isArray(raw.items)) {
    return raw.items.reduce((sum, item) => sum + item.timeMs, 0);
  }
  if (raw.axis === AxisType.MEMORY && Array.isArray(raw.sequences)) {
    return raw.sequences.reduce((sum, sequence) => sum + sequence.timeMs, 0);
  }
  if (
    raw.axis === AxisType.VISUAL_DISCRIMINATION &&
    Array.isArray(raw.trials)
  ) {
    return raw.trials.reduce((sum, trial) => sum + trial.timeMs, 0);
  }
  if (raw.axis === AxisType.REACTIVITY && Array.isArray(raw.stimuli)) {
    return AXIS_TRAINING[AxisType.REACTIVITY].timer.durationSec * 1000;
  }
  return 0;
}

export const FULL_SESSION_AXIS_ORDER: AxisType[] = [
  AxisType.LOGIC,
  AxisType.MEMORY,
  AxisType.VISUAL_DISCRIMINATION,
  AxisType.REACTIVITY,
  AxisType.MOTOR_SKILLS,
];

export function resolveSessionAxes(mode: SessionMode, axis?: AxisType): AxisType[] {
  if (mode === SessionMode.FULL) {
    return FULL_SESSION_AXIS_ORDER;
  }
  if (!axis) {
    throw new BadRequestException(
      'A targeted or tutorial session requires a target axis',
    );
  }
  return [axis];
}

export interface StreakState {
  current: number;
  longest: number;
  lastActivityDate: Date | null;
}

export function computeStreakUpdate(
  previous: StreakState,
  now: Date,
  timezone: string,
): StreakState {
  const todayNumber = localDayNumber(now, timezone);
  if (previous.lastActivityDate) {
    const lastNumber = localDayNumber(previous.lastActivityDate, timezone);
    if (lastNumber === todayNumber) {
      return { ...previous, lastActivityDate: now };
    }
    if (lastNumber === previousLocalDayNumber(now, timezone)) {
      const current = previous.current + 1;
      return {
        current,
        longest: Math.max(previous.longest, current),
        lastActivityDate: now,
      };
    }
  }
  return { current: 1, longest: Math.max(previous.longest, 1), lastActivityDate: now };
}
