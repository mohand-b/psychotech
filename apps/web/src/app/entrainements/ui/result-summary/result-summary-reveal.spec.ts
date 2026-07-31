import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AxisType, Sector, SectorReferentialDto } from '@psychotech/shared';
import { ScoreReveal } from '../../../shared/ui/score-reveal/score-reveal';
import { ResultSummary } from './result-summary';

const REFERENTIAL: SectorReferentialDto = {
  code: Sector.RAILWAY,
  label: 'Ferroviaire',
  isActive: true,
  admissibilityThreshold: 70,
  vigilanceThreshold: 65,
  eliminatoryThreshold: 55,
  axes: [
    {
      code: AxisType.LOGIC,
      label: 'Logique',
      description: '',
      coefficient: 1,
      isCritical: false,
    },
  ],
};

interface RevealStub {
  value: WritableSignal<number>;
  stampVisible: WritableSignal<boolean>;
  stampStrike: WritableSignal<boolean>;
  settlePulse: WritableSignal<boolean>;
  start: ReturnType<typeof vi.fn>;
}

async function setup(): Promise<{
  fixture: ComponentFixture<ResultSummary>;
  reveal: RevealStub;
}> {
  const reveal: RevealStub = {
    value: signal(0),
    stampVisible: signal(false),
    stampStrike: signal(false),
    settlePulse: signal(false),
    start: vi.fn(),
  };
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [ResultSummary],
  })
    .overrideComponent(ResultSummary, {
      set: { providers: [{ provide: ScoreReveal, useValue: reveal }] },
    })
    .compileComponents();
  const fixture = TestBed.createComponent(ResultSummary);
  fixture.componentRef.setInput('axis', AxisType.LOGIC);
  fixture.componentRef.setInput('score', 82);
  fixture.componentRef.setInput('previousBestScore', null);
  fixture.componentRef.setInput('bestScore', 82);
  fixture.componentRef.setInput('isNewBest', false);
  fixture.componentRef.setInput('isEqualBest', false);
  fixture.componentRef.setInput('sector', Sector.RAILWAY);
  fixture.componentRef.setInput('completedAt', '2026-07-16T10:00:00.000Z');
  fixture.componentRef.setInput('referential', REFERENTIAL);
  fixture.detectChanges();
  return { fixture, reveal };
}

function noteOf(fixture: ComponentFixture<ResultSummary>): number {
  const node = fixture.nativeElement.querySelector(
    '.summary__score-value',
  ) as HTMLElement;
  return Number((node.textContent ?? '').trim());
}

function barWidthOf(fixture: ComponentFixture<ResultSummary>): number {
  const fill = fixture.nativeElement.querySelector(
    'ui-threshold-bar .bar__fill',
  ) as HTMLElement;
  const hidden = /inset\(0 ([\d.]+)% 0 0/.exec(fill.style.clipPath);
  return hidden ? 100 - Number.parseFloat(hidden[1]) : Number.NaN;
}

describe('ResultSummary reveal wiring', () => {
  it.each([0, 17.4, 55.9, 82, 92.3])(
    'drives the note and the bar from the same animated value (%s)',
    async (animated) => {
      const { fixture, reveal } = await setup();

      reveal.value.set(animated);
      fixture.detectChanges();

      expect(noteOf(fixture)).toBe(Math.round(animated));
      expect(barWidthOf(fixture)).toBeCloseTo(Math.min(100, animated), 5);
    },
  );

  it('keeps the note and the bar in step across the whole wobble', async () => {
    const { fixture, reveal } = await setup();
    const samples = [0, 29.1, 69.8, 92.3, 80.7, 82];

    for (const animated of samples) {
      reveal.value.set(animated);
      fixture.detectChanges();
      expect([animated, noteOf(fixture)]).toEqual([
        animated,
        Math.round(barWidthOf(fixture)),
      ]);
    }
  });

  it('starts the reveal once, on the final score', async () => {
    const { reveal } = await setup();

    expect(reveal.start).toHaveBeenCalledTimes(1);
    expect(reveal.start).toHaveBeenCalledWith(82);
  });

  it('holds the stamp back while wobbling, then strikes it', async () => {
    const { fixture, reveal } = await setup();
    const stamp = () =>
      fixture.nativeElement.querySelector('.summary__stamp') as HTMLElement;

    expect(stamp().classList.contains('verdict-stamp-pending')).toBe(true);
    expect(stamp().classList.contains('verdict-stamp-strike')).toBe(false);

    reveal.stampVisible.set(true);
    reveal.stampStrike.set(true);
    fixture.detectChanges();

    expect(stamp().classList.contains('verdict-stamp-strike')).toBe(true);
    expect(stamp().classList.contains('verdict-stamp-pending')).toBe(false);
  });

  it('never animates the note: the strike is carried by the stamp alone', async () => {
    const { fixture, reveal } = await setup();

    reveal.stampVisible.set(true);
    reveal.stampStrike.set(true);
    fixture.detectChanges();

    const score = fixture.nativeElement.querySelector(
      '.summary__score',
    ) as HTMLElement;
    const note = fixture.nativeElement.querySelector(
      '.summary__score-value',
    ) as HTMLElement;
    const stamp = fixture.nativeElement.querySelector(
      '.summary__stamp',
    ) as HTMLElement;

    expect(score.className).not.toMatch(/verdict-/);
    expect(note.className).not.toMatch(/verdict-/);
    expect(stamp.classList.contains('verdict-stamp-strike')).toBe(true);
  });
});
