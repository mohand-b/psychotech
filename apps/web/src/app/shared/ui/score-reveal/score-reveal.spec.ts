import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import {
  ScoreReveal,
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
    expect(Math.max(...seen)).toBeLessThanOrEqual(82);
    expect(seen[seen.length - 1]).toBe(82);
  }, 12000);

  it('climbs to the target without ever going back down', async () => {
    const reveal = setup(false);
    const seen: number[] = [];

    reveal.start(82);
    for (let frame = 0; frame < 140; frame += 1) {
      await new Promise((resolve) => setTimeout(resolve, 45));
      seen.push(reveal.value());
    }

    expect(Math.max(...seen)).toBeLessThanOrEqual(82);
    expect(seen[seen.length - 1]).toBe(82);

    const drops = seen.filter(
      (current, index) => index > 0 && current < seen[index - 1] - 0.01,
    );
    expect(drops).toEqual([]);
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
