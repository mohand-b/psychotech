import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AxisType } from '@psychotech/shared';
import { AxisRadar, AxisRadarEntry } from './axis-radar';

const AXES = [
  AxisType.LOGIC,
  AxisType.MEMORY,
  AxisType.VISUAL_DISCRIMINATION,
  AxisType.REACTIVITY,
  AxisType.MOTOR_SKILLS,
];

function entriesOf(scores: number[]): AxisRadarEntry[] {
  return AXES.map((axis, index) => ({ axis, score: scores[index] }));
}

const LAST_SESSION = entriesOf([40, 50, 60, 70, 80]);
const BEST_SCORES = entriesOf([90, 95, 88, 92, 86]);

@Component({
  imports: [AxisRadar],
  template: `<ui-axis-radar [entries]="entries()" />`,
})
class RadarHost {
  readonly entries = signal<AxisRadarEntry[]>(LAST_SESSION);
}

function areaPoints(fixture: ComponentFixture<RadarHost>): string {
  const element: HTMLElement = fixture.nativeElement;
  return element.querySelector('.radar__area')?.getAttribute('points') ?? '';
}

describe('AxisRadar', () => {
  let reducedMotion: boolean;
  const originalMatchMedia = window.matchMedia;

  beforeEach(async () => {
    reducedMotion = false;
    window.matchMedia = ((query: string) => ({
      matches: reducedMotion,
      media: query,
    })) as typeof window.matchMedia;
    await TestBed.configureTestingModule({ imports: [RadarHost] }).compileComponents();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    TestBed.resetTestingModule();
  });

  async function setup() {
    const fixture = TestBed.createComponent(RadarHost);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  it('draws the first data set straight away, without morphing from nothing', async () => {
    const fixture = await setup();
    expect(areaPoints(fixture)).not.toBe('');
    expect(areaPoints(fixture)).toContain(',');
  });

  it('leaves the polygon on its previous shape when the data set changes, then moves it', async () => {
    const fixture = await setup();
    const before = areaPoints(fixture);

    fixture.componentInstance.entries.set(BEST_SCORES);
    fixture.detectChanges();

    expect(areaPoints(fixture)).toBe(before);

    await new Promise((resolve) => setTimeout(resolve, 200));
    fixture.detectChanges();

    const midway = areaPoints(fixture);
    expect(midway).not.toBe(before);
  });

  it('jumps to the new data set when reduced motion is preferred', async () => {
    reducedMotion = true;
    const fixture = await setup();
    const before = areaPoints(fixture);

    fixture.componentInstance.entries.set(BEST_SCORES);
    fixture.detectChanges();

    expect(areaPoints(fixture)).not.toBe(before);
  });

  it('drops the morph and shows the new data set as soon as the tab is hidden', async () => {
    const fixture = await setup();
    const before = areaPoints(fixture);

    fixture.componentInstance.entries.set(BEST_SCORES);
    fixture.detectChanges();
    expect(areaPoints(fixture)).toBe(before);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));
    fixture.detectChanges();

    const shown = areaPoints(fixture);
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });

    expect(shown).not.toBe(before);

    await new Promise((resolve) => setTimeout(resolve, 200));
    fixture.detectChanges();
    expect(areaPoints(fixture)).toBe(shown);
  });

  it('collapses an empty profile onto the centre without morphing', async () => {
    const fixture = await setup();
    fixture.componentInstance.entries.set([]);
    fixture.detectChanges();

    expect(areaPoints(fixture)).toBe('85,64 85,64 85,64 85,64 85,64');
  });
});
