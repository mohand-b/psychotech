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

const holdScene = vi.fn();
const releaseScene = vi.fn();
const replay = vi.fn();
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
        useValue: { holdScene, releaseScene, replay },
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
    holdScene.mockClear();
    releaseScene.mockClear();
    replay.mockClear();
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

    expect(holdScene).not.toHaveBeenCalled();
    expect(releaseScene).not.toHaveBeenCalled();
    expect(replay).not.toHaveBeenCalled();
    expect(acknowledgeAll).not.toHaveBeenCalled();
  });

  it('offers signing up instead of the session actions', async () => {
    const { fixture, navigate } = await setup();
    const text: string = fixture.nativeElement.textContent ?? '';

    expect(text).toContain('Obtenez votre propre bilan');
    expect(text).not.toContain('Nouvel entraînement');
    expect(text).not.toContain('Retour aux entraînements');

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('ui-action-footer button'),
    ) as HTMLButtonElement[];
    buttons[0].click();
    expect(navigate).toHaveBeenCalledWith(['/register']);
  });

  it('leaves the axis rows inert, since there is no session to open', async () => {
    const { fixture } = await setup();
    const rows = Array.from(
      fixture.nativeElement.querySelectorAll('.bilan__axis-row'),
    ) as HTMLButtonElement[];

    expect(rows.every((row) => row.disabled)).toBe(true);
    expect(
      fixture.nativeElement.querySelector('.bilan__axis-detail'),
    ).toBeNull();
  });
});
