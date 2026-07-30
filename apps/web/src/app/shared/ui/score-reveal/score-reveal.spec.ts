import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import {
  SCORE_REVEAL_BOUNCE_STEPS,
  SCORE_REVEAL_CEILING,
  ScoreReveal,
  bounceFor,
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

  it('crosses the target several times before it settles', async () => {
    const reveal = setup(false);
    const seen: number[] = [];

    reveal.start(82);
    for (let frame = 0; frame < 100; frame += 1) {
      await new Promise((resolve) => setTimeout(resolve, 45));
      seen.push(reveal.value());
    }

    let crossings = 0;
    let above = seen[0] > 82;
    for (const value of seen) {
      const nowAbove = value > 82;
      if (nowAbove !== above && Math.abs(value - 82) > 0.3) {
        crossings += 1;
        above = nowAbove;
      }
    }

    expect(crossings).toBeGreaterThanOrEqual(3);
  }, 12000);

  it('settles on the target then strikes the stamp', async () => {
    const reveal = setup(false);

    reveal.start(82);
    await new Promise((resolve) => setTimeout(resolve, 4600));

    expect(reveal.value()).toBe(82);
    expect(reveal.stampVisible()).toBe(true);
    expect(reveal.stampStrike()).toBe(true);
  }, 10000);

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
    await new Promise((resolve) => setTimeout(resolve, 4600));

    expect(reveal.value()).toBe(64);
  }, 10000);
});

describe('bounceFor', () => {
  it('picks the liveliest bounce that never pushes the note over 100', () => {
    for (const target of [0, 12, 40, 60, 78, 82, 90, 95, 99, 100]) {
      const bounce = bounceFor(target);
      const step = SCORE_REVEAL_BOUNCE_STEPS.find(
        (entry) => entry.bounce === bounce,
      );
      expect([target, step !== undefined]).toEqual([target, true]);
      const peak = target * (step?.peakRatio ?? 1);
      const livelier = SCORE_REVEAL_BOUNCE_STEPS.filter(
        (entry) => entry.bounce > bounce,
      );
      expect([target, peak <= SCORE_REVEAL_CEILING + 0.001]).toEqual([
        target,
        true,
      ]);
      for (const entry of livelier) {
        expect([
          target,
          target * entry.peakRatio > SCORE_REVEAL_CEILING,
        ]).toEqual([target, true]);
      }
    }
  });

  it('gives the top score the calmest bounce and a mid score a lively one', () => {
    expect(bounceFor(100)).toBe(0);
    expect(bounceFor(60)).toBe(0.62);
  });
});
