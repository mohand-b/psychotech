import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadgeCelebrationFacade } from '../../badges/data-access/badge-celebration.facade';
import { BadgesFacade } from '../../badges/data-access/badges.facade';
import { SimulationSummaryFacade } from '../../sessions/data-access/simulation-summary.facade';
import { SimulationSummary } from '../../sessions/feature/simulation-summary/simulation-summary';
import { TrainingSessionFacade } from '../../sessions/data-access/training-session.facade';
import { ExampleBilanFacade } from '../data-access/example-bilan.facade';

const prepareResultCelebration = vi.fn();
const acknowledgeAll = vi.fn();

async function setup() {
  await TestBed.configureTestingModule({
    imports: [SimulationSummary],
    providers: [
      provideRouter([]),
      { provide: SimulationSummaryFacade, useClass: ExampleBilanFacade },
      { provide: TrainingSessionFacade, useValue: { session: signal(null) } },
      { provide: BadgesFacade, useValue: { acknowledgeAll } },
      {
        provide: BadgeCelebrationFacade,
        useValue: { prepareResultCelebration },
      },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { paramMap: convertToParamMap({}), data: { demo: true } },
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(SimulationSummary);
  const navigate = vi
    .spyOn(TestBed.inject(Router), 'navigate')
    .mockResolvedValue(true);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, navigate };
}

describe('Public example bilan', () => {
  beforeEach(() => {
    prepareResultCelebration.mockClear();
    acknowledgeAll.mockClear();
  });

  it('renders the real report from the fixture', async () => {
    const { fixture } = await setup();
    const text: string = fixture.nativeElement.textContent ?? '';

    expect(text).toContain('Exemple de bilan');
    expect(text).toContain('Données fictives');
    expect(
      fixture.nativeElement.querySelectorAll('.bilan__axis-row'),
    ).toHaveLength(5);
  });

  it('never touches the badge engine nor acknowledges anything', async () => {
    await setup();

    expect(prepareResultCelebration).not.toHaveBeenCalled();
    expect(acknowledgeAll).not.toHaveBeenCalled();
  });

  it('offers signing up instead of the session actions', async () => {
    const { fixture, navigate } = await setup();
    const text: string = fixture.nativeElement.textContent ?? '';

    expect(text).toContain('Obtenez votre propre bilan');
    expect(text).not.toContain('Nouvel entraînement');
    expect(text).not.toContain('Retour aux entraînements');

    const buttons = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('ui-action-footer button'),
    );
    buttons[0].click();
    expect(navigate).toHaveBeenCalledWith(['/register']);
  });

  it('opens the axis detail from the fixture, without any network call', async () => {
    const { fixture } = await setup();
    const rows = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('.bilan__axis-row'),
    );

    rows[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const detail = fixture.nativeElement.querySelector('.bilan__axis-detail');
    expect(detail).not.toBeNull();
    expect(detail.textContent).not.toContain('Détail indisponible');
    expect(detail.textContent).not.toContain('Chargement du détail');
    expect(detail.querySelector('ui-simulation-axis-detail')).not.toBeNull();
  });

  it('never offers to review answers that no visitor has given', async () => {
    const { fixture } = await setup();
    const rows = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('.bilan__axis-row'),
    );

    rows[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const detail = fixture.nativeElement.querySelector('.bilan__axis-detail');
    expect(detail.querySelector('.detail__review')).toBeNull();
    expect(detail.textContent).not.toContain('Revoir mes réponses');
  });

  it('shows the same axis score in the row and in its detail', async () => {
    const { fixture } = await setup();
    const rows = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('.bilan__axis-row'),
    );
    const rowScore = rows[2]
      .querySelector('.bilan__axis-score')
      ?.textContent?.trim();

    (rows[2] as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const detailText: string =
      fixture.nativeElement.querySelector('.bilan__axis-detail')?.textContent ??
      '';
    expect(rowScore).toBeTruthy();
    expect(detailText.length).toBeGreaterThan(0);
  });
});
