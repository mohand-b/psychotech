import { BadRequestException } from '@nestjs/common';
import {
  AXIS_TRAINING,
  AxisType,
  FULL_SESSION_AXIS_ORDER,
  SessionMode,
} from '@psychotech/shared';
import { describe, expect, it } from 'vitest';
import {
  activePlayDurationSec,
  computeStreakUpdate,
  resolveSessionAxes,
} from './sessions.logic';

describe('resolveSessionAxes', () => {
  it('covers the five axes in order for a full session', () => {
    expect(resolveSessionAxes(SessionMode.FULL)).toEqual([
      AxisType.LOGIC,
      AxisType.MEMORY,
      AxisType.VISUAL_DISCRIMINATION,
      AxisType.REACTIVITY,
      AxisType.MOTOR_SKILLS,
    ]);
    expect(resolveSessionAxes(SessionMode.FULL)).toEqual([
      ...FULL_SESSION_AXIS_ORDER,
    ]);
  });

  it('targets a single axis for targeted and tutorial sessions', () => {
    expect(resolveSessionAxes(SessionMode.TARGETED, AxisType.MEMORY)).toEqual([
      AxisType.MEMORY,
    ]);
    expect(resolveSessionAxes(SessionMode.TUTORIAL, AxisType.LOGIC)).toEqual([
      AxisType.LOGIC,
    ]);
  });

  it('rejects targeted or tutorial sessions without a target axis', () => {
    expect(() => resolveSessionAxes(SessionMode.TARGETED)).toThrow(BadRequestException);
    expect(() => resolveSessionAxes(SessionMode.TUTORIAL)).toThrow(BadRequestException);
  });
});

describe('activePlayDurationSec', () => {
  it('sums the played exercise times across axes without any wall-clock timestamp', () => {
    const durationSec = activePlayDurationSec([
      {
        metrics: {
          axis: AxisType.LOGIC,
          items: [
            { index: 0, answerIndex: 1, timeMs: 80000, helpUsed: false, visited: true },
            { index: 1, answerIndex: null, timeMs: 41000, helpUsed: false, visited: true },
          ],
        },
      },
      {
        metrics: {
          axis: AxisType.MEMORY,
          sequences: [{ index: 0, input: [1, 2], timeMs: 9000, timedOut: false }],
        },
      },
      { metrics: null },
    ]);
    expect(durationSec).toBe(130);
  });

  it('counts the full trial duration for a played reactivity axis', () => {
    const durationSec = activePlayDurationSec([
      {
        metrics: {
          axis: AxisType.REACTIVITY,
          stimuli: [{ index: 0, commandPressed: 'LEFT', trMs: 400 }],
          waitPresses: [],
        },
      },
    ]);
    expect(durationSec).toBe(
      AXIS_TRAINING[AxisType.REACTIVITY].timer.durationSec,
    );
  });

  it('returns zero when nothing was played', () => {
    expect(activePlayDurationSec([{ metrics: null }, { metrics: null }])).toBe(0);
  });
});

describe('computeStreakUpdate', () => {
  const timezone = 'Europe/Paris';
  const now = new Date('2026-06-13T10:00:00Z');

  it('starts a streak at one when there is no previous activity', () => {
    const streak = computeStreakUpdate(
      { current: 0, longest: 0, lastActivityDate: null },
      now,
      timezone,
    );
    expect(streak).toEqual({ current: 1, longest: 1, lastActivityDate: now });
  });

  it('increments the streak on a consecutive local day', () => {
    const streak = computeStreakUpdate(
      { current: 3, longest: 5, lastActivityDate: new Date('2026-06-12T09:00:00Z') },
      now,
      timezone,
    );
    expect(streak.current).toBe(4);
    expect(streak.longest).toBe(5);
    expect(streak.lastActivityDate).toBe(now);
  });

  it('keeps the streak unchanged for a second activity on the same local day', () => {
    const streak = computeStreakUpdate(
      { current: 3, longest: 5, lastActivityDate: new Date('2026-06-13T06:00:00Z') },
      now,
      timezone,
    );
    expect(streak.current).toBe(3);
    expect(streak.longest).toBe(5);
  });

  it('resets the streak after a missed day', () => {
    const streak = computeStreakUpdate(
      { current: 7, longest: 7, lastActivityDate: new Date('2026-06-11T10:00:00Z') },
      now,
      timezone,
    );
    expect(streak.current).toBe(1);
    expect(streak.longest).toBe(7);
  });
});
