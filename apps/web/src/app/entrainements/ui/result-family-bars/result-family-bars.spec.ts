import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LogicFamily, LogicFamilyResultDto } from '@psychotech/shared';
import { ResultFamilyBars } from './result-family-bars';

function entry(
  family: LogicFamily,
  overrides: Partial<LogicFamilyResultDto> = {},
): LogicFamilyResultDto {
  return {
    family,
    correct: 8,
    attempted: 10,
    total: 10,
    ratePct: 80,
    timeMs: 90_000,
    marker: null,
    ...overrides,
  };
}

async function setup(
  families: LogicFamilyResultDto[],
): Promise<ComponentFixture<ResultFamilyBars>> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [ResultFamilyBars],
  }).compileComponents();
  const fixture = TestBed.createComponent(ResultFamilyBars);
  fixture.componentRef.setInput('families', families);
  fixture.detectChanges();
  return fixture;
}

function texts(
  fixture: ComponentFixture<ResultFamilyBars>,
  selector: string,
): string[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll(selector) as NodeListOf<HTMLElement>,
  ).map((element) => (element.textContent ?? '').trim());
}

describe('ResultFamilyBars', () => {
  it('renders the four families with parenthesized matrix labels', async () => {
    const fixture = await setup([
      entry(LogicFamily.NUMERIC),
      entry(LogicFamily.DOMINO),
      entry(LogicFamily.MATRIX_I),
      entry(LogicFamily.MATRIX_II),
    ]);
    expect(texts(fixture, '.family__name')).toEqual([
      'Numérique',
      'Dominos',
      'Matrices (lecture)',
      'Matrices (déduction)',
    ]);
    expect(fixture.nativeElement.textContent).not.toContain('—');
  });

  it('renders the strength and weakness markers with their own colors', async () => {
    const fixture = await setup([
      entry(LogicFamily.NUMERIC, { marker: 'STRENGTH' }),
      entry(LogicFamily.DOMINO, { marker: 'WEAKNESS' }),
      entry(LogicFamily.MATRIX_I),
    ]);
    const markers = fixture.nativeElement.querySelectorAll(
      '.family__marker',
    ) as NodeListOf<HTMLElement>;
    expect(markers).toHaveLength(2);
    expect(markers[0].textContent).toContain('Votre force');
    expect(markers[0].classList.contains('family__marker--strength')).toBe(
      true,
    );
    expect(markers[1].textContent).toContain('À travailler');
    expect(markers[1].classList.contains('family__marker--strength')).toBe(
      false,
    );
  });

  it('colors each gauge according to the rating thresholds 80/70/60', async () => {
    const fixture = await setup([
      entry(LogicFamily.NUMERIC, { ratePct: 85 }),
      entry(LogicFamily.DOMINO, { ratePct: 72 }),
      entry(LogicFamily.MATRIX_I, { ratePct: 65 }),
      entry(LogicFamily.MATRIX_II, { ratePct: 40 }),
    ]);
    const fills = Array.from(
      fixture.nativeElement.querySelectorAll(
        '.family__fill',
      ) as NodeListOf<HTMLElement>,
    ).map((element) => element.getAttribute('style') ?? '');
    expect(fills[0]).toContain('var(--rating-good)');
    expect(fills[1]).toContain('var(--rating-ok)');
    expect(fills[2]).toContain('var(--rating-weak)');
    expect(fills[3]).toContain('var(--rating-bad)');
    expect(fills[0]).toContain('width: 85%');
  });

  it('renders a single markerless row for a filtered session of 40 items', async () => {
    const fixture = await setup([
      entry(LogicFamily.DOMINO, {
        correct: 30,
        attempted: 38,
        total: 40,
        ratePct: 75,
      }),
    ]);
    expect(texts(fixture, '.family__name')).toEqual(['Dominos']);
    expect(fixture.nativeElement.querySelector('.family__marker')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('/40');
  });

  it('renders two markerless rows of 20 items for a Matrices-filtered session', async () => {
    const fixture = await setup([
      entry(LogicFamily.MATRIX_I, { total: 20, correct: 15, ratePct: 75 }),
      entry(LogicFamily.MATRIX_II, { total: 20, correct: 12, ratePct: 60 }),
    ]);
    expect(texts(fixture, '.family__name')).toEqual([
      'Matrices (lecture)',
      'Matrices (déduction)',
    ]);
    expect(fixture.nativeElement.querySelector('.family__marker')).toBeNull();
    expect(texts(fixture, '.family__total')).toEqual(['/20', '/20']);
  });

  it('formats the invested time as m:ss', async () => {
    const fixture = await setup([
      entry(LogicFamily.NUMERIC, { timeMs: 90_000 }),
    ]);
    expect(texts(fixture, '.family__time')).toEqual(['1:30']);
  });
});
