import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  AxisType,
  ScoreBand,
  Sector,
  SectorReferentialDto,
} from '@psychotech/shared';
import { CatalogFacade } from '../../../catalog/data-access/catalog.facade';
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
    {
      code: AxisType.REACTIVITY,
      label: 'Réactivité',
      description: '',
      coefficient: 1.4,
      isCritical: true,
    },
  ],
};

async function setup(inputs: {
  score: number;
  previousBestScore: number | null;
  axis?: AxisType;
  isNewBest?: boolean;
  recordVisible?: boolean;
}): Promise<ComponentFixture<ResultSummary>> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [ResultSummary],
    providers: [
      {
        provide: CatalogFacade,
        useValue: {
          sectorReferential: signal(REFERENTIAL),
          loadSectorReferential: vi.fn(),
        },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ResultSummary);
  fixture.componentRef.setInput('axis', inputs.axis ?? AxisType.LOGIC);
  fixture.componentRef.setInput('score', inputs.score);
  fixture.componentRef.setInput('band', ScoreBand.ACCEPTABLE);
  fixture.componentRef.setInput('previousBestScore', inputs.previousBestScore);
  fixture.componentRef.setInput(
    'bestScore',
    Math.max(inputs.score, inputs.previousBestScore ?? 0),
  );
  fixture.componentRef.setInput('isNewBest', inputs.isNewBest ?? false);
  fixture.componentRef.setInput('isEqualBest', false);
  fixture.componentRef.setInput('sector', Sector.RAILWAY);
  fixture.componentRef.setInput('completedAt', '2026-07-16T10:00:00.000Z');
  fixture.componentRef.setInput('recordVisible', inputs.recordVisible ?? true);
  fixture.detectChanges();
  return fixture;
}

function deltaText(fixture: ComponentFixture<ResultSummary>): string | null {
  const delta = fixture.nativeElement.querySelector(
    '.summary__delta',
  ) as HTMLElement | null;
  return delta ? (delta.textContent ?? '').trim() : null;
}

describe('ResultSummary', () => {
  it('shows a positive delta against the previous best when the record is beaten', async () => {
    const fixture = await setup({
      score: 78,
      previousBestScore: 70,
      isNewBest: true,
    });
    expect(deltaText(fixture)).toBe('+8');
  });

  it('shows a negative delta against the previous best when the record stands', async () => {
    const fixture = await setup({ score: 62, previousBestScore: 70 });
    expect(deltaText(fixture)).toBe('-8');
  });

  it('shows no delta on a first session without previous best', async () => {
    const fixture = await setup({
      score: 62,
      previousBestScore: null,
      isNewBest: true,
    });
    expect(deltaText(fixture)).toBeNull();
  });

  it.each([
    [95, 'Excellent'],
    [92, 'Solide'],
    [84.9, 'Bon'],
    [70, 'Bon'],
    [65, 'Fragile'],
    [58, 'Faible'],
  ])(
    'stamps a one-word verdict without date for score %s (%s)',
    async (score, word) => {
      const fixture = await setup({ score, previousBestScore: null });
      const stamp = fixture.nativeElement.querySelector('.summary__stamp');
      expect(stamp.querySelector('.stamp__main').textContent.trim()).toBe(
        word,
      );
      expect(stamp.querySelector('.stamp__sub')).toBeNull();
    },
  );

  it('overrides the stamp with ÉLIMINATOIRE for a critical axis under 55', async () => {
    const fixture = await setup({
      score: 52,
      previousBestScore: null,
      axis: AxisType.REACTIVITY,
    });
    const stamp = fixture.nativeElement.querySelector('.summary__stamp');
    expect(stamp.querySelector('.stamp__main').textContent.trim()).toBe(
      'Éliminatoire',
    );
    expect(
      stamp.querySelector('.stamp').classList.contains('stamp--eliminatory'),
    ).toBe(true);
  });

  it('never stamps a non-critical axis as eliminatory', async () => {
    const fixture = await setup({ score: 30, previousBestScore: null });
    expect(
      fixture.nativeElement
        .querySelector('.summary__stamp .stamp__main')
        .textContent.trim(),
    ).toBe('Faible');
  });

  it('hides the best line and the delta when the record is not visible', async () => {
    const fixture = await setup({
      score: 78,
      previousBestScore: 70,
      isNewBest: true,
      recordVisible: false,
    });
    expect(deltaText(fixture)).toBeNull();
    expect(
      fixture.nativeElement.querySelector('.summary__best'),
    ).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('record');
  });
});
