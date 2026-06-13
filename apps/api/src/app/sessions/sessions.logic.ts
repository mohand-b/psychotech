import { BadRequestException } from '@nestjs/common';
import { AxisType, SessionMode } from '@psychotech/shared';
import { localDayNumber, previousLocalDayNumber } from '../common/timezone.util';

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
