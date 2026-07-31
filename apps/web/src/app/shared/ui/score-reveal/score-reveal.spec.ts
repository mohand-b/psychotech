import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import {
  SCORE_REVEAL_CEILING,
  ScoreReveal,
  revealPathFor,
  swingScaleFor,
  visualDurationFor,
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

    reveal.start(82);

    expect(reveal.value()).toBe(82);
    expect(reveal.stampVisible()).toBe(true);
    expect(reveal.stampStrike()).toBe(false);
  });
});

describe('ScoreReveal phases', () => {
  it('holds the stamp back while it wobbles', () => {
    const reveal = setup(false);

    reveal.start(82);

    expect(reveal.stampVisible()).toBe(false);
    expect(reveal.stampStrike()).toBe(false);
  });

  it('exposes the target from the very first frame so a frozen animation stays readable', () => {
    const reveal = setup(false);

    reveal.start(82);

    expect(reveal.value()).toBe(82);
  });

  it('drops to zero and climbs back once the animation actually drives', async () => {
    const reveal = setup(false);
    const seen: number[] = [];

    reveal.start(82);
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

    reveal.start(82);
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

    reveal.start(SCORE_REVEAL_CEILING);
    for (let frame = 0; frame < 90; frame += 1) {
      await new Promise((resolve) => setTimeout(resolve, 45));
      seen.push(reveal.value());
    }

    expect(Math.max(...seen)).toBeLessThanOrEqual(SCORE_REVEAL_CEILING);
  }, 14000);

  it('settles on the target then strikes the stamp', async () => {
    const reveal = setup(false);

    reveal.start(82);
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

    reveal.start(82);
    reveal.start(12);

    expect(reveal.value()).toBe(82);
  });

  it('keeps the first target even when a later call arrives mid-animation', async () => {
    const reveal = setup(false);

    reveal.start(64);
    reveal.start(99);
    await new Promise((resolve) => setTimeout(resolve, 7000));

    expect(reveal.value()).toBe(64);
  }, 12000);
});

describe('visualDurationFor', () => {
  it('keeps the same climbing speed whatever the score', () => {
    const rateOf = (target: number) => target / visualDurationFor(target);
    expect(rateOf(90)).toBeCloseTo(rateOf(60), 5);
    expect(rateOf(60)).toBeCloseTo(rateOf(30), 5);
  });

  it('lets a high score simply take longer', () => {
    expect(visualDurationFor(90)).toBeGreaterThan(visualDurationFor(30));
  });

  it('keeps a floor so a very low score stays readable', () => {
    expect(visualDurationFor(0)).toBeGreaterThan(0);
    expect(visualDurationFor(2)).toBe(visualDurationFor(0));
  });
});

describe('revealPathFor', () => {
  it('swings twice around the score and ends on the score itself', () => {
    const { keyframes } = revealPathFor(50);

    expect(keyframes[0]).toBe(0);
    expect(keyframes[keyframes.length - 1]).toBe(50);
    const swings = keyframes.slice(1, -1);
    expect(swings.filter((value) => value > 50)).toHaveLength(2);
    expect(swings.filter((value) => value < 50)).toHaveLength(2);
  });

  it('keeps the same swing amplitude whatever the score', () => {
    expect(revealPathFor(20).keyframes[1] - 20).toBeCloseTo(
      revealPathFor(80).keyframes[1] - 80,
      5,
    );
  });

  it('never leaves the zero to hundred range', () => {
    for (const target of [0, 1, 5, 50, 95, 97, 99, 100]) {
      const { keyframes } = revealPathFor(target);
      expect(Math.max(...keyframes)).toBeLessThanOrEqual(100);
      expect(Math.min(...keyframes)).toBeGreaterThanOrEqual(0);
    }
  });

  it('drops the swing when the score is too high or too low to hold it', () => {
    expect(swingScaleFor(100)).toBe(0);
    expect(swingScaleFor(0)).toBe(0);
    expect(swingScaleFor(50)).toBe(1);
    expect(revealPathFor(100).keyframes).toEqual([0, 100]);
  });
});

describe('vitesse de montée', () => {
  it('climbs from zero at the same points per second whatever the score', () => {
    const rateOf = (target: number) => {
      const { keyframes, times, durationSec } = revealPathFor(target);
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
  return revealPathFor(target).keyframes[0];
}
