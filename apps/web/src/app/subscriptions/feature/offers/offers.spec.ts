import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SubscriptionTier } from '@psychotech/shared';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { Offers } from './offers';

async function setup(tier: SubscriptionTier) {
  const coreFacade = {
    tier: signal(tier),
    setTierOverride: vi.fn(),
  };
  await TestBed.configureTestingModule({
    imports: [Offers],
    providers: [
      provideRouter([]),
      { provide: CoreFacade, useValue: coreFacade },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(Offers);
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  fixture.detectChanges();
  return { fixture, coreFacade, navigate };
}

function texts(element: HTMLElement, selector: string): string[] {
  return Array.from(element.querySelectorAll(selector)).map(
    (node) => node.textContent?.trim() ?? '',
  );
}

describe('Offers', () => {
  it('marks the essential card as current for the essential plan', async () => {
    const { fixture } = await setup(SubscriptionTier.ESSENTIAL);
    const element: HTMLElement = fixture.nativeElement;
    expect(texts(element, '.offd__current-badge')).toContain(
      'Votre formule actuelle',
    );
    expect(texts(element, '.offd .offers__current-pill')).toHaveLength(1);
    expect(
      texts(element, '.offd__card--featured .offd__featured-badge')[0],
    ).toBe('Recommandé pour la préparation intensive');
    expect(texts(element, '.offd ui-button button')).toEqual([
      'Passer en Découverte',
      "Passer à l'Illimité",
    ]);
  });

  it('marks the unlimited card as current for the unlimited plan', async () => {
    const { fixture } = await setup(SubscriptionTier.UNLIMITED);
    const element: HTMLElement = fixture.nativeElement;
    expect(
      texts(element, '.offd__card--featured .offd__featured-badge')[0],
    ).toBe('Votre formule actuelle');
    expect(
      element.querySelector('.offd .offers__current-pill--featured'),
    ).not.toBeNull();
    expect(texts(element, '.offd ui-button button')).toEqual([
      'Passer en Découverte',
      'Choisir Essentiel',
    ]);
  });

  it('marks the discovery card as current for the free plan', async () => {
    const { fixture } = await setup(SubscriptionTier.FREE);
    const element: HTMLElement = fixture.nativeElement;
    const freeCard = element.querySelector('.offd__card');
    expect(freeCard?.querySelector('.offd__current-badge')).not.toBeNull();
    expect(freeCard?.querySelector('.offers__current-pill')).not.toBeNull();
    expect(texts(element, '.offd ui-button button')).toEqual([
      'Choisir Essentiel',
      "Passer à l'Illimité",
    ]);
  });

  it('switches the plan placeholder and returns to the trainings page', async () => {
    const { fixture, coreFacade, navigate } = await setup(
      SubscriptionTier.FREE,
    );
    const element: HTMLElement = fixture.nativeElement;
    const buttons = element.querySelectorAll<HTMLButtonElement>(
      '.offd ui-button button',
    );
    buttons[1].click();
    expect(coreFacade.setTierOverride).toHaveBeenCalledWith(
      SubscriptionTier.UNLIMITED,
    );
    expect(navigate).toHaveBeenCalledWith(['/entrainements']);
  });

  it('renders the seven comparison rows', async () => {
    const { fixture } = await setup(SubscriptionTier.ESSENTIAL);
    const element: HTMLElement = fixture.nativeElement;
    const rows = element.querySelectorAll('.cmp__row:not(.cmp__row--head)');
    expect(rows).toHaveLength(7);
    expect(texts(element, '.cmp__label--desktop')[1]).toBe('Énergie par jour');
  });
});
