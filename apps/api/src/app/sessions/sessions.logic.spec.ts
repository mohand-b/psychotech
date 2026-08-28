import { BadRequestException } from '@nestjs/common';
import {
  AXIS_TRAINING,
  AxisType,
  DiscriminationTrialAnswerDto,
  FULL_SESSION_AXIS_ORDER,
  SessionMode,
  TrainingOptionId,
} from '@psychotech/shared';
import { describe, expect, it } from 'vitest';
import {
  activePlayDurationSec,
  axisContentFullyPlayed,
  computeStreakUpdate,
  globalTimerExhausted,
  resolveHistoryScope,
  resolveSessionAxes,
} from './sessions.logic';

describe('resolveHistoryScope', () => {
  it('leaves an unfiltered scope untouched', () => {
    expect(resolveHistoryScope({})).toEqual({
      mode: undefined,
      axis: undefined,
    });
  });

  it.each([SessionMode.FULL, SessionMode.TARGETED])(
    'keeps a bare %s mode filter untouched',
    (mode) => {
      expect(resolveHistoryScope({ mode })).toEqual({ mode, axis: undefined });
    },
  );

  it('couples a bare axis filter to targeted sessions', () => {
    expect(resolveHistoryScope({ axis: AxisType.LOGIC })).toEqual({
      mode: SessionMode.TARGETED,
      axis: AxisType.LOGIC,
    });
  });

  it('keeps an axis filter already scoped to targeted sessions', () => {
    expect(
      resolveHistoryScope({
        mode: SessionMode.TARGETED,
        axis: AxisType.MEMORY,
      }),
    ).toEqual({ mode: SessionMode.TARGETED, axis: AxisType.MEMORY });
  });

  it('refuses an axis filter on full sessions', () => {
    expect(() =>
      resolveHistoryScope({
        mode: SessionMode.FULL,
        axis: AxisType.REACTIVITY,
      }),
    ).toThrow(BadRequestException);
  });
});

describe('resolveSessionAxes', () => {
  it('covers the five axes in order for a full session', () => {
    expect(resolveSessionAxes(SessionMode.FULL)).toEqual([
      AxisType.VISUAL_DISCRIMINATION,
      AxisType.LOGIC,
      AxisType.MEMORY,
      AxisType.MOTOR_SKILLS,
      AxisType.REACTIVITY,
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

describe('globalTimerExhausted', () => {
  const timed = { trainingOptions: [] };
  const untimed = { trainingOptions: [TrainingOptionId.NO_TIMER] };
  const startedAt = new Date('2026-06-13T10:00:00Z');
  const durationMs =
    AXIS_TRAINING[AxisType.VISUAL_DISCRIMINATION].timer.durationSec * 1000;

  it('declares the timer spent when both clocks reached its duration', () => {
    expect(
      globalTimerExhausted(
        AxisType.VISUAL_DISCRIMINATION,
        timed,
        startedAt,
        new Date(startedAt.getTime() + durationMs),
        durationMs,
      ),
    ).toBe(true);
  });

  it('keeps the timer running one millisecond short of its duration', () => {
    expect(
      globalTimerExhausted(
        AxisType.VISUAL_DISCRIMINATION,
        timed,
        startedAt,
        new Date(startedAt.getTime() + durationMs - 1),
        durationMs,
      ),
    ).toBe(false);
  });

  it('refuses a play time the server clock could not have allowed', () => {
    expect(
      globalTimerExhausted(
        AxisType.VISUAL_DISCRIMINATION,
        timed,
        startedAt,
        new Date(startedAt.getTime() + 2000),
        durationMs * 10,
      ),
    ).toBe(false);
  });

  it('refuses a stale session where only the server clock ran out', () => {
    expect(
      globalTimerExhausted(
        AxisType.VISUAL_DISCRIMINATION,
        timed,
        startedAt,
        new Date(startedAt.getTime() + durationMs * 100),
        5000,
      ),
    ).toBe(false);
  });

  it('refuses a completion that reports no play time at all', () => {
    expect(
      globalTimerExhausted(
        AxisType.VISUAL_DISCRIMINATION,
        timed,
        startedAt,
        new Date(startedAt.getTime() + durationMs),
        undefined,
      ),
    ).toBe(false);
  });

  it('never spends a timer an untimed session does not run', () => {
    expect(
      globalTimerExhausted(
        AxisType.VISUAL_DISCRIMINATION,
        untimed,
        startedAt,
        new Date(startedAt.getTime() + durationMs * 10),
        durationMs * 10,
      ),
    ).toBe(false);
  });

  it.each([AxisType.MEMORY, AxisType.MOTOR_SKILLS])(
    'never spends a global timer on %s, played exercise by exercise',
    (axis) => {
      expect(
        globalTimerExhausted(
          axis,
          timed,
          startedAt,
          new Date(startedAt.getTime() + durationMs * 10),
          durationMs * 10,
        ),
      ).toBe(false);
    },
  );
});

describe('axisContentFullyPlayed on an expired timer', () => {
  const answeredTrials = (count: number): DiscriminationTrialAnswerDto[] =>
    Array.from({ length: count }, (_, index) => ({
      index,
      answer: 'IDENTICAL' as const,
      timeMs: 900,
    }));

  const unansweredTrials = (from: number): DiscriminationTrialAnswerDto[] =>
    Array.from(
      {
        length:
          AXIS_TRAINING[AxisType.VISUAL_DISCRIMINATION].exerciseCount - from,
      },
      (_, offset) => ({ index: from + offset, answer: null, timeMs: 0 }),
    );

  const partialRun = {
    axis: AxisType.VISUAL_DISCRIMINATION as const,
    trials: [...answeredTrials(9), ...unansweredTrials(9)],
  };

  it('accepts a discrimination run left unfinished when the timer ran out', () => {
    expect(axisContentFullyPlayed(partialRun, undefined, true)).toBe(true);
  });

  it('still refuses the very same run while the timer had time left', () => {
    expect(axisContentFullyPlayed(partialRun, undefined, false)).toBe(false);
  });
});
