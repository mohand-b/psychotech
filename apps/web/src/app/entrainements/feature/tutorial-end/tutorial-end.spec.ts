import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { AxisType, Sector } from '@psychotech/shared';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { BadgesFacade } from '../../../badges/data-access/badges.facade';
import { TutorialRunFacade } from '../../data-access/tutorial-run.facade';
import { TutorialEnd } from './tutorial-end';

async function setup() {
  const notifyTutorialDiscovered = vi.fn();
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [TutorialEnd],
    providers: [
      provideRouter([]),
      { provide: BadgesFacade, useValue: { notifyTutorialDiscovered } },
      {
        provide: AuthFacade,
        useValue: { currentUser: () => ({ currentSector: Sector.RAILWAY }) },
      },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { paramMap: convertToParamMap({ axis: 'logique' }) },
        },
      },
    ],
  }).compileComponents();
  const runFacade = TestBed.inject(TutorialRunFacade);
  runFacade.record({
    axis: AxisType.LOGIC,
    items: [
      {
        index: 0,
        answerIndex: 0,
        timeMs: 2000,
        helpUsed: false,
        visited: true,
      },
      {
        index: 1,
        answerIndex: null,
        timeMs: 0,
        helpUsed: false,
        visited: false,
      },
      {
        index: 2,
        answerIndex: null,
        timeMs: 0,
        helpUsed: false,
        visited: false,
      },
      {
        index: 3,
        answerIndex: null,
        timeMs: 0,
        helpUsed: false,
        visited: false,
      },
      {
        index: 4,
        answerIndex: null,
        timeMs: 0,
        helpUsed: false,
        visited: false,
      },
    ],
  });
  const fixture = TestBed.createComponent(TutorialEnd);
  fixture.detectChanges();
  return Object.assign(fixture, { notifyTutorialDiscovered });
}

function buttonLabels(element: HTMLElement): string[] {
  return Array.from(element.querySelectorAll('ui-button')).map(
    (button) => button.textContent?.trim() ?? '',
  );
}

describe('TutorialEnd', () => {
  it('shows local observables without any /100 score', async () => {
    const fixture = await setup();
    const element: HTMLElement = fixture.nativeElement;
    const text = element.textContent ?? '';
    expect(text).toContain('Découverte terminée');
    expect(text).toContain('Bonnes réponses');
    expect(text).toContain('Aperçu réduit, sans notation ni analyse.');
    expect(text).not.toContain('/100');
  });

  it('offers the targeted training and another axis to discover', async () => {
    const fixture = await setup();
    const labels = buttonLabels(fixture.nativeElement);
    expect(labels).toContain('Entraînement ciblé');
    expect(labels).toContain('Découvrir un autre axe');
    expect(labels).not.toContain('Découvrir les offres');
  });
});

describe('TutorialEnd - badge tutoriel', () => {
  it('signals the finished tutorial once the end screen opens', async () => {
    const fixture = await setup();
    expect(fixture.notifyTutorialDiscovered).toHaveBeenCalledTimes(1);
  });
});
