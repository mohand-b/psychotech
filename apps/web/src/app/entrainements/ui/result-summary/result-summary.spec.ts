import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AxisType, Sector, SectorReferentialDto } from '@psychotech/shared';
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
  }).compileComponents();
  const fixture = TestBed.createComponent(ResultSummary);
  fixture.componentRef.setInput('axis', inputs.axis ?? AxisType.LOGIC);
  fixture.componentRef.setInput('score', inputs.score);
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
  fixture.componentRef.setInput('referential', REFERENTIAL);
  fixture.detectChanges();
  return fixture;
}

function deltaText(fixture: ComponentFixture<ResultSummary>): string | null {
  const delta = fixture.nativeElement.querySelector(
    '.summary__delta',
  ) as HTMLElement | null;
  return delta ? (delta.textContent ?? '').trim() : null;
}

function textOf(
  fixture: ComponentFixture<ResultSummary>,
  selector: string,
): string | null {
  const node = fixture.nativeElement.querySelector(
    selector,
  ) as HTMLElement | null;
  return node ? (node.textContent ?? '').replace(/\s+/g, ' ').trim() : null;
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

  it('tags a critical axis of the sector and leaves a non-critical one untagged', async () => {
    const critical = await setup({
      score: 72,
      previousBestScore: null,
      axis: AxisType.REACTIVITY,
    });
    expect(textOf(critical, '.summary__critical')).toBe('Axe critique');

    const plain = await setup({ score: 72, previousBestScore: null });
    expect(plain.nativeElement.querySelector('.summary__critical')).toBeNull();
  });

  it('marks the eliminatory threshold of a critical axis on the bar', async () => {
    const fixture = await setup({
      score: 72,
      previousBestScore: null,
      axis: AxisType.REACTIVITY,
    });
    const bar = fixture.nativeElement.querySelector('ui-threshold-bar');

    expect(
      textOf(fixture, '.summary__bar-threshold-label--desktop'),
    ).toContain('Axe critique, seuil éliminatoire');
    expect(textOf(fixture, '.summary__bar-threshold-value')).toBe('55');
    expect(bar.querySelector('.bar__marker').style.left).toBe('55%');
  });

  it('marks the vigilance threshold of a non-critical axis on the bar', async () => {
    const fixture = await setup({ score: 72, previousBestScore: null });
    const bar = fixture.nativeElement.querySelector('ui-threshold-bar');

    expect(textOf(fixture, '.summary__bar-threshold-label--desktop')).toBe(
      'Seuil de vigilance :',
    );
    expect(textOf(fixture, '.summary__bar-threshold-value')).toBe('65');
    expect(bar.querySelector('.bar__marker').style.left).toBe('65%');
  });

  it.each([
    [AxisType.REACTIVITY, 72, '+17,0 au-dessus', 'above'],
    [AxisType.REACTIVITY, 52, '-3,0 en dessous', 'below'],
    [AxisType.LOGIC, 72, '+7,0 au-dessus', 'above'],
    [AxisType.LOGIC, 61, '-4,0 en dessous', 'below'],
  ])(
    'signs the gap of %s at score %s as %s',
    async (axis, score, label, side) => {
      const fixture = await setup({ score, previousBestScore: null, axis });
      const gap = fixture.nativeElement.querySelector(
        '.summary__gap',
      ) as HTMLElement;

      expect(gap.textContent?.trim()).toBe(label);
      expect(gap.classList.contains(`summary__gap--${side}`)).toBe(true);
    },
  );

  it('flags a critical axis under its eliminatory threshold without repeating the stamp word', async () => {
    const fixture = await setup({
      score: 52,
      previousBestScore: null,
      axis: AxisType.REACTIVITY,
    });
    const tag = fixture.nativeElement.querySelector(
      '.summary__critical',
    ) as HTMLElement;

    expect(tag.classList.contains('summary__critical--alert')).toBe(true);
    expect(tag.textContent?.trim()).toBe('Axe critique');
    expect(textOf(fixture, '.summary__eliminatory-note')).toContain(
      "rend l'avis défavorable",
    );
  });

  it('keeps the eliminatory note off a critical axis above its threshold', async () => {
    const fixture = await setup({
      score: 62,
      previousBestScore: null,
      axis: AxisType.REACTIVITY,
    });

    expect(
      fixture.nativeElement.querySelector('.summary__eliminatory-note'),
    ).toBeNull();
    expect(
      fixture.nativeElement
        .querySelector('.summary__critical')
        .classList.contains('summary__critical--alert'),
    ).toBe(false);
  });

  it('paints the threshold bar with the identity gradient of the axis', async () => {
    const fixture = await setup({
      score: 72,
      previousBestScore: null,
      axis: AxisType.REACTIVITY,
    });
    const bar = fixture.nativeElement.querySelector(
      'ui-threshold-bar',
    ) as HTMLElement;

    expect(bar.style.getPropertyValue('--threshold-bar-fill-from')).toBe(
      'var(--axis-reactivity-text)',
    );
    expect(bar.style.getPropertyValue('--threshold-bar-fill-to')).toBe(
      'var(--axis-reactivity)',
    );
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
