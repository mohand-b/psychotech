import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import {
  SCORE_REVEAL_CEILING,
  ScoreReveal,
  buildRevealPath,
  interpolateRevealValue,
  computeSwingScale,
  computeClimbDuration,
} from './score-reveal';

function setup(reducedMotion: boolean): ScoreReveal {
  TestBed.resetTestingModule();
  const realDocument = document;
  TestBed.configureTestingModule({
    providers: [
      ScoreReveal,
      {
        provide: DOCUMENT,
        useValue: {
          defaultView: {
            matchMedia: (query: string) => ({
              matches: reducedMotion && query.includes('reduce'),
            }),
            requestAnimationFrame:
              realDocument.defaultView?.requestAnimationFrame.bind(
                realDocument.defaultView,
              ),
          },
        },
      },
    ],
  });
  return TestBed.inject(ScoreReveal);
}

describe('ScoreReveal with reduced motion', () => {
  it('lands on the final state without any wobble nor strike', () => {
    const reveal = setup(true);

    reveal.revealScore(82);

    expect(reveal.value()).toBe(82);
    expect(reveal.stampVisible()).toBe(true);
    expect(reveal.stampStrike()).toBe(false);
  });
});

describe('ScoreReveal phases', () => {
  it('holds the stamp back while it wobbles', () => {
    const reveal = setup(false);

    reveal.revealScore(82);

    expect(reveal.stampVisible()).toBe(false);
    expect(reveal.stampStrike()).toBe(false);
  });

  it('exposes the target from the very first frame so a frozen animation stays readable', () => {
    const reveal = setup(false);

    reveal.revealScore(82);

    expect(reveal.value()).toBe(82);
  });

  it('drops to zero and climbs back once the animation actually drives', async () => {
    const reveal = setup(false);
    const seen: number[] = [];

    reveal.revealScore(82);
    for (let frame = 0; frame < 100; frame += 1) {
      await new Promise((resolve) => setTimeout(resolve, 45));
      seen.push(reveal.value());
    }

    expect(Math.min(...seen)).toBeLessThan(82);
    expect(Math.max(...seen)).toBeGreaterThan(82);
    expect(seen[seen.length - 1]).toBe(82);
  }, 12000);

  it('oscillates around the target before it settles', async () => {
    const reveal = setup(false);
    const seen: number[] = [];

    reveal.revealScore(82);
    for (let frame = 0; frame < 120; frame += 1) {
      await new Promise((resolve) => setTimeout(resolve, 45));
      seen.push(reveal.value());
    }

    expect(Math.max(...seen)).toBeGreaterThan(82);
    expect(Math.min(...seen)).toBeLessThan(82);
    expect(seen[seen.length - 1]).toBe(82);
  }, 14000);

  it('never lets the reveal display a score above the ceiling', async () => {
    const reveal = setup(false);
    const seen: number[] = [];

    reveal.revealScore(SCORE_REVEAL_CEILING);
    for (let frame = 0; frame < 90; frame += 1) {
      await new Promise((resolve) => setTimeout(resolve, 45));
      seen.push(reveal.value());
    }

    expect(Math.max(...seen)).toBeLessThanOrEqual(SCORE_REVEAL_CEILING);
  }, 14000);

  it('settles on the target then strikes the stamp', async () => {
    const reveal = setup(false);

    reveal.revealScore(82);
    await new Promise((resolve) => setTimeout(resolve, 7000));

    expect(reveal.value()).toBe(82);
    expect(reveal.stampVisible()).toBe(true);
    expect(reveal.stampStrike()).toBe(true);
  }, 12000);

  it('exposes the final state by default so a failed animation stays readable', () => {
    const reveal = setup(false);

    expect(reveal.stampVisible()).toBe(true);
  });
});

describe('ScoreReveal single trigger', () => {
  it('ignores every call after the first one', () => {
    const reveal = setup(true);

    reveal.revealScore(82);
    reveal.revealScore(12);

    expect(reveal.value()).toBe(82);
  });

  it('keeps the first target even when a later call arrives mid-animation', async () => {
    const reveal = setup(false);

    reveal.revealScore(64);
    reveal.revealScore(99);
    await new Promise((resolve) => setTimeout(resolve, 7000));

    expect(reveal.value()).toBe(64);
  }, 12000);
});

describe('computeClimbDuration', () => {
  it('keeps the same climbing speed whatever the score', () => {
    const rateOf = (target: number) => target / computeClimbDuration(target);
    expect(rateOf(90)).toBeCloseTo(rateOf(60), 5);
    expect(rateOf(60)).toBeCloseTo(rateOf(30), 5);
  });

  it('lets a high score simply take longer', () => {
    expect(computeClimbDuration(90)).toBeGreaterThan(computeClimbDuration(30));
  });

  it('keeps a floor so a very low score stays readable', () => {
    expect(computeClimbDuration(0)).toBeGreaterThan(0);
    expect(computeClimbDuration(2)).toBe(computeClimbDuration(0));
  });
});

describe('buildRevealPath', () => {
  it('swings twice around the score and ends on the score itself', () => {
    const { keyframes } = buildRevealPath(50);

    expect(keyframes[0]).toBe(0);
    expect(keyframes[keyframes.length - 1]).toBe(50);
    const swings = keyframes.slice(1, -1);
    expect(swings.filter((value) => value > 50)).toHaveLength(2);
    expect(swings.filter((value) => value < 50)).toHaveLength(2);
  });

  it('keeps the same swing amplitude whatever the score', () => {
    expect(buildRevealPath(20).keyframes[1] - 20).toBeCloseTo(
      buildRevealPath(80).keyframes[1] - 80,
      5,
    );
  });

  it('never leaves the zero to hundred range', () => {
    for (const target of [0, 1, 5, 50, 95, 97, 99, 100]) {
      const { keyframes } = buildRevealPath(target);
      expect(Math.max(...keyframes)).toBeLessThanOrEqual(100);
      expect(Math.min(...keyframes)).toBeGreaterThanOrEqual(0);
    }
  });

  it('drops the swing when the score is too high or too low to hold it', () => {
    expect(computeSwingScale(100)).toBe(0);
    expect(computeSwingScale(0)).toBe(0);
    expect(computeSwingScale(50)).toBe(1);
    expect(buildRevealPath(100).keyframes).toEqual([0, 100]);
  });
});

describe('vitesse de montée', () => {
  it('climbs from zero at the same points per second whatever the score', () => {
    const rateOf = (target: number) => {
      const { keyframes, times, durationSec } = buildRevealPath(target);
      const climbSec = times[1] * durationSec;
      return keyframes[1] / climbSec;
    };

    expect(keyframeStart(20)).toBe(0);
    expect(keyframeStart(82)).toBe(0);
    expect(rateOf(20)).toBeCloseTo(rateOf(50), 3);
    expect(rateOf(50)).toBeCloseTo(rateOf(82), 3);
    expect(rateOf(82)).toBeCloseTo(rateOf(95), 3);
  });
});

function keyframeStart(target: number): number {
  return buildRevealPath(target).keyframes[0];
}

describe('interpolateRevealValue', () => {
  it('starts the reveal at zero and reaches the score at the end', () => {
    const path = buildRevealPath(82);

    expect(interpolateRevealValue(path, 0)).toBe(0);
    expect(interpolateRevealValue(path, 1)).toBe(82);
  });

  it('spends the whole climb below the first peak', () => {
    const path = buildRevealPath(82);
    const climbEnd = path.times[1];

    expect(interpolateRevealValue(path, climbEnd * 0.25)).toBeLessThan(40);
    expect(interpolateRevealValue(path, climbEnd * 0.5)).toBeLessThan(70);
    expect(interpolateRevealValue(path, climbEnd)).toBeCloseTo(
      path.keyframes[1],
      5,
    );
  });

  it('never jumps straight to the neighbourhood of the score', () => {
    const path = buildRevealPath(82);

    expect(interpolateRevealValue(path, 0.02)).toBeLessThan(10);
  });
});

describe('régularité de la montée', () => {
  const climbSpeeds = (target: number, upTo: number) => {
    const path = buildRevealPath(target);
    const climbEnd = path.times[1];
    const speeds: number[] = [];
    for (let step = 0; step < 16; step += 1) {
      const from = (climbEnd * upTo * step) / 16;
      const to = (climbEnd * upTo * (step + 1)) / 16;
      const seconds = (to - from) * path.durationSec;
      speeds.push(
        (interpolateRevealValue(path, to) -
          interpolateRevealValue(path, from)) /
          seconds,
      );
    }
    return speeds;
  };

  it('holds one steady speed over the constant part of the climb', () => {
    for (const target of [20, 50, 82, 95]) {
      const speeds = climbSpeeds(target, 0.75);
      const spread = Math.max(...speeds) - Math.min(...speeds);
      expect([target, spread < 0.5]).toEqual([target, true]);
    }
  });

  it('slows down at the very top so the turn is not a dead stop', () => {
    const path = buildRevealPath(82);
    const climbEnd = path.times[1];
    const stepBefore = climbEnd * 0.995;
    const cruising = climbSpeeds(82, 0.75)[0];
    const seconds = (climbEnd - stepBefore) * path.durationSec;
    const arriving =
      (interpolateRevealValue(path, climbEnd) -
        interpolateRevealValue(path, stepBefore)) /
      seconds;

    expect(arriving).toBeLessThan(cruising * 0.25);
  });
});

describe('rythme des rebonds', () => {
  const speedsOf = (target: number) => {
    const { keyframes, times, durationSec } = buildRevealPath(target);
    return keyframes.slice(1).map((value, index) => {
      const leg = Math.abs(value - keyframes[index]);
      const seconds = (times[index + 1] - times[index]) * durationSec;
      return leg / seconds;
    });
  };

  it('settles slower than it climbs, so the swings stay readable', () => {
    for (const target of [20, 50, 82, 95]) {
      const [climb, ...swings] = speedsOf(target);
      expect([target, swings.every((swing) => swing < climb)]).toEqual([
        target,
        true,
      ]);
    }
  });

  it('slows down from one reversal to the next', () => {
    const [, ...swings] = speedsOf(82);
    swings.forEach((swing, index) => {
      if (index > 0) {
        expect(swing).toBeLessThan(swings[index - 1]);
      }
    });
  });

  it('keeps every swing long enough to be seen', () => {
    for (const target of [20, 50, 82, 95]) {
      const { times, durationSec } = buildRevealPath(target);
      const legs = times
        .slice(1)
        .map((time, index) => (time - times[index]) * durationSec);
      expect([target, legs.slice(1).every((leg) => leg >= 0.15)]).toEqual([
        target,
        true,
      ]);
    }
  });
});
