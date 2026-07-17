import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { SubscriptionDto, SubscriptionTier } from '@psychotech/shared';
import { of } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { SubscriptionsFacade } from '../../data-access/subscriptions.facade';
import { Offers } from './offers';

interface SetupOptions {
  carte?: string;
  subscription?: Partial<SubscriptionDto>;
}

async function setup(tier: SubscriptionTier, options: SetupOptions = {}) {
  const subscription =
    tier === SubscriptionTier.FREE
      ? null
      : {
          tier,
          status: 'ACTIVE',
          billingPeriod: 'MONTHLY',
          currentPeriodEnd: '2026-08-17T00:00:00.000Z',
          cancelAtPeriodEnd: false,
          ...options.subscription,
        };
  const subscriptionsFacade = {
    changePlan: vi.fn().mockReturnValue(of(SubscriptionTier.UNLIMITED)),
    cancelSubscription: vi.fn().mockReturnValue(of(undefined)),
    resumeSubscription: vi.fn().mockReturnValue(of(undefined)),
    refreshTier: vi.fn().mockReturnValue(of(tier)),
  };
  await TestBed.configureTestingModule({
    imports: [Offers],
    providers: [
      provideRouter([]),
      { provide: CoreFacade, useValue: { tier: signal(tier) } },
      {
        provide: AuthFacade,
        useValue: { currentUser: signal({ subscription }) },
      },
      { provide: SubscriptionsFacade, useValue: subscriptionsFacade },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParamMap: convertToParamMap(
              options.carte ? { carte: options.carte } : {},
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
  return { fixture, subscriptionsFacade, navigate };
}

function texts(element: HTMLElement, selector: string): string[] {
  return Array.from(element.querySelectorAll(selector)).map(
    (node) => node.textContent?.replace(/ /g, ' ').trim() ?? '',
  );
}

describe('Offers', () => {
  it('marks the essential card as current with in-app management actions', async () => {
    const { fixture } = await setup(SubscriptionTier.ESSENTIAL);
    const element: HTMLElement = fixture.nativeElement;
    expect(texts(element, '.offd__current-badge')).toContain(
      'Votre formule actuelle',
    );
    expect(texts(element, '.offd ui-button button')).toEqual([
      'Mettre à jour ma carte',
      'Résilier mon abonnement',
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
    expect(prices).toContain('8,99 €');
    expect(prices).toContain('14,99 €');
  });

  it('sends a free user picking a paid plan to the payment page', async () => {
    const { fixture, navigate } = await setup(SubscriptionTier.FREE);
    const buttons = (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll<HTMLButtonElement>('.offd ui-button button');
    buttons[1].click();
    expect(navigate).toHaveBeenCalledWith(['/paiement', 'illimite']);
  });

  it('sends a subscribed user picking another plan to the change page', async () => {
    const { fixture, navigate } = await setup(SubscriptionTier.ESSENTIAL);
    const buttons = (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll<HTMLButtonElement>('.offd ui-button button');
    buttons[2].click();
    expect(navigate).toHaveBeenCalledWith(['/paiement', 'illimite']);
  });

  it('cancels the subscription in-app after an inline confirmation', async () => {
    const { fixture, subscriptionsFacade } = await setup(
      SubscriptionTier.ESSENTIAL,
    );
    const element: HTMLElement = fixture.nativeElement;
    const cancelButton = () =>
      element.querySelectorAll<HTMLButtonElement>('.offd ui-button button')[1];

    cancelButton().click();
    fixture.detectChanges();
    expect(subscriptionsFacade.cancelSubscription).not.toHaveBeenCalled();
    expect(cancelButton().textContent?.trim()).toBe(
      'Confirmer la résiliation',
    );

    cancelButton().click();
    fixture.detectChanges();
    expect(subscriptionsFacade.cancelSubscription).toHaveBeenCalledTimes(1);
    expect(element.querySelector('.offers__banner')?.textContent).toContain(
      'Résiliation enregistrée.',
    );
  });

  it('offers to resume a subscription scheduled for cancellation', async () => {
    const { fixture, subscriptionsFacade } = await setup(
      SubscriptionTier.UNLIMITED,
      { subscription: { cancelAtPeriodEnd: true } },
    );
    const element: HTMLElement = fixture.nativeElement;
    expect(texts(element, '.offers__cancel-note')[0]).toContain(
      'prend fin le',
    );
    const resumeButton = Array.from(
      element.querySelectorAll<HTMLButtonElement>('.offd ui-button button'),
    ).find((button) => button.textContent?.includes('Reprendre'));
    resumeButton?.click();
    expect(subscriptionsFacade.resumeSubscription).toHaveBeenCalledTimes(1);
  });

  it('shows the card update banner when returning from the card page', async () => {
    const { fixture, navigate } = await setup(SubscriptionTier.ESSENTIAL, {
      carte: 'maj',
    });
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.offers__banner')
        ?.textContent,
    ).toContain('Votre carte a été mise à jour.');
    expect(navigate).toHaveBeenCalled();
  });

  it('renders the seven comparison rows', async () => {
    const { fixture } = await setup(SubscriptionTier.ESSENTIAL);
    const element: HTMLElement = fixture.nativeElement;
    const rows = element.querySelectorAll('.cmp__row:not(.cmp__row--head)');
    expect(rows).toHaveLength(7);
    expect(texts(element, '.cmp__label--desktop')[1]).toBe('Énergie par jour');
  });
});
