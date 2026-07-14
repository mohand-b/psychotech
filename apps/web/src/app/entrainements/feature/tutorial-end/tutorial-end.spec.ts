import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { AxisType, SubscriptionTier } from '@psychotech/shared';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { TutorialRunFacade } from '../../data-access/tutorial-run.facade';
import { TutorialEnd } from './tutorial-end';

async function setup(tier: SubscriptionTier) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [TutorialEnd],
    providers: [
      provideRouter([]),
      { provide: CoreFacade, useValue: { tier: signal(tier) } },
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
  return fixture;
}

function buttonLabels(element: HTMLElement): string[] {
  return Array.from(element.querySelectorAll('ui-button')).map(
    (button) => button.textContent?.trim() ?? '',
  );
}

describe('TutorialEnd', () => {
  it('shows local observables without any /100 score', async () => {
    const fixture = await setup(SubscriptionTier.FREE);
    const element: HTMLElement = fixture.nativeElement;
    const text = element.textContent ?? '';
    expect(text).toContain('Tutoriel terminé');
    expect(text).toContain('Bonnes réponses');
    expect(text).toContain('Aperçu réduit, sans notation ni analyse.');
    expect(text).not.toContain('/100');
  });

  it('offers the subscriptions page to discovery users', async () => {
    const fixture = await setup(SubscriptionTier.FREE);
    const labels = buttonLabels(fixture.nativeElement);
    expect(labels).toContain('Découvrir les offres');
    expect(labels).toContain('Essayer un autre tutoriel');
  });

  it('offers the targeted training to paying users', async () => {
    const fixture = await setup(SubscriptionTier.ESSENTIAL);
    const labels = buttonLabels(fixture.nativeElement);
    expect(labels).toContain('Entraînement ciblé');
    expect(labels).toContain('Essayer un autre tutoriel');
    expect(labels).not.toContain('Découvrir les offres');
  });
});
