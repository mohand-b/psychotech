import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import {
  SCORE_REVEAL_CEILING,
  ScoreReveal,
  bounceFor,
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

describe('bounceFor', () => {
  it('keeps the liveliest bounce whose peak still fits under the ceiling', () => {
    for (const target of [0, 40, 82, 90, 95, 99, 100]) {
      expect([target, target * peakRatioOf(bounceFor(target))]).toEqual([
        target,
        expect.closeTo(target * peakRatioOf(bounceFor(target)), 5),
      ]);
      expect(target * peakRatioOf(bounceFor(target))).toBeLessThanOrEqual(
        SCORE_REVEAL_CEILING + 0.001,
      );
    }
  });

  it('gives a full score no bounce at all', () => {
    expect(bounceFor(100)).toBe(0);
  });
});

function peakRatioOf(bounce: number): number {
  const ratios: Record<number, number> = {
    0.62: 1.275,
    0.45: 1.126,
    0.35: 1.068,
    0.25: 1.028,
    0.15: 1.006,
    0: 1,
  };
  return ratios[bounce] ?? 1;
}

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
