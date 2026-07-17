import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { SubscriptionTier } from '@psychotech/shared';
import { EMPTY, of } from 'rxjs';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { SubscriptionsFacade } from '../../data-access/subscriptions.facade';
import { Offers } from './offers';

interface SetupOptions {
  checkout?: string;
  refreshedTier?: SubscriptionTier;
}

async function setup(tier: SubscriptionTier, options: SetupOptions = {}) {
  const coreFacade = {
    tier: signal(tier),
  };
  const subscriptionsFacade = {
    startCheckout: vi.fn().mockReturnValue(EMPTY),
    openPortal: vi.fn().mockReturnValue(EMPTY),
    changePlan: vi.fn().mockReturnValue(of(SubscriptionTier.UNLIMITED)),
    refreshTier: vi
      .fn()
      .mockReturnValue(of(options.refreshedTier ?? tier)),
  };
  await TestBed.configureTestingModule({
    imports: [Offers],
    providers: [
      provideRouter([]),
      { provide: CoreFacade, useValue: coreFacade },
      { provide: SubscriptionsFacade, useValue: subscriptionsFacade },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParamMap: convertToParamMap(
              options.checkout ? { checkout: options.checkout } : {},
            ),
          },
        },
      },
    ],
  }).compileComponents();
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(Offers);
  fixture.detectChanges();
  return { fixture, coreFacade, subscriptionsFacade, navigate };
}

function texts(element: HTMLElement, selector: string): string[] {
  return Array.from(element.querySelectorAll(selector)).map(
    (node) => node.textContent?.trim() ?? '',
  );
}

describe('Offers', () => {
  it('marks the essential card as current and offers the portal', async () => {
    const { fixture } = await setup(SubscriptionTier.ESSENTIAL);
    const element: HTMLElement = fixture.nativeElement;
    expect(texts(element, '.offd__current-badge')).toContain(
      'Votre formule actuelle',
    );
    expect(
      texts(element, '.offd__card--featured .offd__featured-badge')[0],
    ).toBe('Recommandé pour la préparation intensive');
    expect(texts(element, '.offd ui-button button')).toEqual([
      'Gérer mon abonnement',
      'Gérer mon abonnement',
      "Passer à l'Illimité",
    ]);
  });

  it('marks the discovery card as current for the free plan', async () => {
    const { fixture } = await setup(SubscriptionTier.FREE);
    const element: HTMLElement = fixture.nativeElement;
    const freeCard = element.querySelector('.offd__card');
    expect(freeCard?.querySelector('.offd__current-badge')).not.toBeNull();
    expect(texts(element, '.offd ui-button button')).toEqual([
      'Choisir Essentiel',
      "Passer à l'Illimité",
    ]);
  });

  it('renders the centralized monthly prices', async () => {
    const { fixture } = await setup(SubscriptionTier.FREE);
    const prices = texts(fixture.nativeElement, '.offd__price');
    expect(prices).toContain('8,99 €');
    expect(prices).toContain('14,99 €');
  });

  it('sends a free user picking a paid plan to the payment page', async () => {
    const { fixture, subscriptionsFacade, navigate } = await setup(
      SubscriptionTier.FREE,
    );
    const buttons = (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll<HTMLButtonElement>('.offd ui-button button');
    buttons[1].click();
    expect(navigate).toHaveBeenCalledWith(['/paiement', 'illimite']);
    expect(subscriptionsFacade.startCheckout).not.toHaveBeenCalled();
    expect(subscriptionsFacade.openPortal).not.toHaveBeenCalled();
  });

  it('opens the customer portal from the manage buttons', async () => {
    const { fixture, subscriptionsFacade } = await setup(
      SubscriptionTier.ESSENTIAL,
    );
    const buttons = (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll<HTMLButtonElement>('.offd ui-button button');
    buttons[0].click();
    expect(subscriptionsFacade.openPortal).toHaveBeenCalledTimes(1);
    expect(subscriptionsFacade.changePlan).not.toHaveBeenCalled();
  });

  it('changes the plan in-app after an inline confirmation', async () => {
    const { fixture, subscriptionsFacade } = await setup(
      SubscriptionTier.ESSENTIAL,
    );
    const element: HTMLElement = fixture.nativeElement;
    const unlimitedButton = () =>
      element.querySelectorAll<HTMLButtonElement>('.offd ui-button button')[2];

    unlimitedButton().click();
    fixture.detectChanges();
    expect(subscriptionsFacade.changePlan).not.toHaveBeenCalled();
    expect(unlimitedButton().textContent?.trim()).toBe(
      'Confirmer le changement',
    );

    unlimitedButton().click();
    fixture.detectChanges();
    expect(subscriptionsFacade.changePlan).toHaveBeenCalledWith(
      SubscriptionTier.UNLIMITED,
    );
    expect(subscriptionsFacade.openPortal).not.toHaveBeenCalled();
    expect(
      element.querySelector('.offers__banner')?.textContent,
    ).toContain('Votre formule a été mise à jour.');
  });

  it('shows the activation banner then confirms once the tier is granted', async () => {
    vi.useFakeTimers();
    try {
      const { fixture } = await setup(SubscriptionTier.FREE, {
        checkout: 'success',
        refreshedTier: SubscriptionTier.ESSENTIAL,
      });
      vi.advanceTimersByTime(0);
      fixture.detectChanges();
      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          '.offers__banner',
        )?.textContent,
      ).toContain('Votre formule est active');
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows a neutral banner on a cancelled checkout', async () => {
    const { fixture, subscriptionsFacade } = await setup(
      SubscriptionTier.FREE,
      { checkout: 'cancelled' },
    );
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.offers__banner')
        ?.textContent,
    ).toContain('Paiement annulé');
    expect(subscriptionsFacade.refreshTier).not.toHaveBeenCalled();
  });

  it('renders the seven comparison rows', async () => {
    const { fixture } = await setup(SubscriptionTier.ESSENTIAL);
    const element: HTMLElement = fixture.nativeElement;
    const rows = element.querySelectorAll('.cmp__row:not(.cmp__row--head)');
    expect(rows).toHaveLength(7);
    expect(texts(element, '.cmp__label--desktop')[1]).toBe('Énergie par jour');
  });
});
