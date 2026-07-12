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

describe('LandingReveal', () => {
  let observed: ObservedEntry[];
  let matchMediaMatches: boolean;
  const originalObserver = window.IntersectionObserver;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    observed = [];
    matchMediaMatches = false;
    window.matchMedia = ((query: string) =>
      ({ matches: matchMediaMatches, media: query })) as typeof window.matchMedia;
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
      unobserve() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    window.IntersectionObserver = originalObserver;
    window.matchMedia = originalMatchMedia;
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

  it('hides the block then reveals it once it intersects', async () => {
    const target = await setup();
    expect(target.classList.contains('landing-reveal')).toBe(true);
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

  it('shows the block immediately when reduced motion is preferred', async () => {
    matchMediaMatches = true;
    const target = await setup();
    expect(target.classList.contains('landing-reveal--in')).toBe(true);
    expect(observed).toHaveLength(0);
  });
});
