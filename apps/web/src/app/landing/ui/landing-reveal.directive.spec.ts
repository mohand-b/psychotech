import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LandingReveal } from './landing-reveal.directive';

@Component({
  imports: [LandingReveal],
  template: `<div class="target" appLandingReveal="0.12s">Bloc</div>`,
})
class RevealHost {}

interface ObservedEntry {
  callback: IntersectionObserverCallback;
  element: Element;
  options: IntersectionObserverInit | undefined;
  disconnected: boolean;
}

const BELOW_THE_FOLD = 2000;
const INSIDE_THE_VIEWPORT = 40;

describe('LandingReveal', () => {
  let observed: ObservedEntry[];
  let matchMediaMatches: boolean;
  let rectTop: number;
  const originalObserver = window.IntersectionObserver;
  const originalMatchMedia = window.matchMedia;
  const originalRect = Element.prototype.getBoundingClientRect;

  beforeEach(() => {
    observed = [];
    matchMediaMatches = false;
    rectTop = BELOW_THE_FOLD;
    Element.prototype.getBoundingClientRect = function () {
      return { top: rectTop } as DOMRect;
    };
    window.matchMedia = ((query: string) => ({
      matches: matchMediaMatches,
      media: query,
    })) as typeof window.matchMedia;
    window.IntersectionObserver = class {
      private readonly entry: ObservedEntry;
      constructor(
        callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit,
      ) {
        this.entry = {
          callback,
          element: undefined as unknown as Element,
          options,
          disconnected: false,
        };
        observed.push(this.entry);
      }
      observe(element: Element) {
        this.entry.element = element;
      }
      disconnect() {
        this.entry.disconnected = true;
      }
      unobserve = (): void => undefined;
      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    window.IntersectionObserver = originalObserver;
    window.matchMedia = originalMatchMedia;
    Element.prototype.getBoundingClientRect = originalRect;
  });

  async function setup() {
    await TestBed.configureTestingModule({
      imports: [RevealHost],
    }).compileComponents();
    const fixture = TestBed.createComponent(RevealHost);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('.target') as HTMLElement;
  }

  it('arms a block below the fold then reveals it once it intersects', async () => {
    const target = await setup();
    expect(target.classList.contains('landing-reveal')).toBe(true);
    expect(target.classList.contains('landing-reveal--armed')).toBe(true);
    expect(target.classList.contains('landing-reveal--in')).toBe(false);
    expect(target.style.transitionDelay).toBe('0.12s');
    const io = observed[0];
    expect(io.element).toBe(target);
    expect(io.options).toEqual({
      threshold: 0.12,
      rootMargin: '0px 0px -6% 0px',
    });

    io.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(target.classList.contains('landing-reveal--in')).toBe(true);
    expect(io.disconnected).toBe(true);
  });

  it('never hides a block that is already inside the viewport', async () => {
    rectTop = INSIDE_THE_VIEWPORT;
    const target = await setup();
    expect(target.classList.contains('landing-reveal--armed')).toBe(false);
    expect(target.style.transitionDelay).toBe('');
    expect(observed).toHaveLength(0);
  });

  it('never hides anything when reduced motion is preferred', async () => {
    matchMediaMatches = true;
    const target = await setup();
    expect(target.classList.contains('landing-reveal--armed')).toBe(false);
    expect(observed).toHaveLength(0);
  });

  it('never hides anything when IntersectionObserver is unavailable', async () => {
    (window as { IntersectionObserver?: unknown }).IntersectionObserver =
      undefined;
    const target = await setup();
    expect(target.classList.contains('landing-reveal--armed')).toBe(false);
    expect(observed).toHaveLength(0);
  });

  it('reveals the block when the observer never answers', async () => {
    vi.useFakeTimers();
    try {
      const target = await setup();
      expect(target.classList.contains('landing-reveal--armed')).toBe(true);
      expect(target.classList.contains('landing-reveal--in')).toBe(false);

      vi.advanceTimersByTime(1000);

      expect(target.classList.contains('landing-reveal--in')).toBe(true);
      expect(observed[0].disconnected).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the block hidden while the observer answers that it is off screen', async () => {
    vi.useFakeTimers();
    try {
      const target = await setup();
      observed[0].callback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );

      vi.advanceTimersByTime(1000);

      expect(target.classList.contains('landing-reveal--in')).toBe(false);
      expect(observed[0].disconnected).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
