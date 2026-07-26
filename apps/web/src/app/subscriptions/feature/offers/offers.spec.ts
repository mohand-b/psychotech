import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import {
  BillingOverviewDto,
  SubscriptionStatus,
  SubscriptionTier,
} from '@psychotech/shared';
import { of } from 'rxjs';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { SubscriptionsFacade } from '../../data-access/subscriptions.facade';
import { Offers } from './offers';

interface SetupOptions {
  overview?: Partial<BillingOverviewDto>;
}

function buildOverview(
  tier: SubscriptionTier,
  overrides: Partial<BillingOverviewDto> = {},
): BillingOverviewDto {
  return {
    tier,
    status: tier === SubscriptionTier.FREE ? null : SubscriptionStatus.ACTIVE,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    currentPeriodEnd:
      tier === SubscriptionTier.FREE ? null : '2026-08-17T00:00:00.000Z',
    pendingTier: null,
    monthlyAmount: null,
    paymentMethod: null,
    nextInvoiceDate:
      tier === SubscriptionTier.FREE ? null : '2026-08-17T00:00:00.000Z',
    ...overrides,
  };
}

async function setup(tier: SubscriptionTier, options: SetupOptions = {}) {
  const overview = buildOverview(tier, options.overview);
  const subscriptionsFacade = {
    changePlan: vi.fn().mockReturnValue(of(SubscriptionTier.UNLIMITED)),
    cancelPlanChange: vi.fn().mockReturnValue(of(undefined)),
    refreshTier: vi.fn().mockReturnValue(of(tier)),
    loadBillingOverview: vi.fn().mockReturnValue(of(overview)),
    openPortal: vi.fn().mockReturnValue(of(undefined)),
    billingOverview: signal<BillingOverviewDto | null>(overview),
    billingLoading: signal(false),
  };
  await TestBed.configureTestingModule({
    imports: [Offers],
    providers: [
      provideRouter([]),
      { provide: CoreFacade, useValue: { tier: signal(tier) } },
      { provide: SubscriptionsFacade, useValue: subscriptionsFacade },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParamMap: convertToParamMap({}),
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
  it('marks the essential card as current with a passive note and the manage section', async () => {
    const { fixture } = await setup(SubscriptionTier.ESSENTIAL);
    const element: HTMLElement = fixture.nativeElement;
    expect(texts(element, '.offd__current-badge')).toContain(
      'Votre formule actuelle',
    );
    expect(texts(element, '.offd .offd__card-note')).toContain(
      'Renouvellement le 17 août 2026',
    );
    expect(texts(element, '.offd ui-button button')).toEqual([
      "Passer à l'Illimité",
    ]);
    const manage = element.querySelector('.offers__manage');
    expect(manage?.textContent).toContain("Gestion de l'abonnement");
    expect(manage?.textContent).toContain('Mettre à jour ma carte');
    expect(manage?.textContent).toContain('Gérer mon abonnement');
    expect(manage?.textContent).not.toContain('Résilier');
  });

  it('marks the discovery card as current for the free plan without management', async () => {
    const { fixture } = await setup(SubscriptionTier.FREE);
    const element: HTMLElement = fixture.nativeElement;
    const freeCard = element.querySelector('.offd__card');
    expect(freeCard?.querySelector('.offd__current-badge')).not.toBeNull();
    expect(freeCard?.textContent).toContain('Gratuit, sans limite de durée');
    expect(texts(element, '.offd ui-button button')).toEqual([
      'Choisir Essentiel',
      "Passer à l'Illimité",
    ]);
    expect(element.querySelector('.offers__manage')).toBeNull();
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
    buttons[0].click();
    expect(navigate).toHaveBeenCalledWith(['/paiement', 'illimite']);
  });

  it('opens the billing portal from the manage action', async () => {
    const { fixture, subscriptionsFacade, navigate } = await setup(
      SubscriptionTier.ESSENTIAL,
    );
    const element: HTMLElement = fixture.nativeElement;
    const manageButton = Array.from(
      element.querySelectorAll<HTMLButtonElement>(
        '.offers__manage ui-button button',
      ),
    ).find((button) => button.textContent?.includes('Gérer mon abonnement'));
    manageButton?.click();
    expect(subscriptionsFacade.openPortal).toHaveBeenCalledWith(
      '/abonnements',
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps the discovery card free of any action button', async () => {
    const { fixture } = await setup(SubscriptionTier.ESSENTIAL);
    const element: HTMLElement = fixture.nativeElement;
    const freeCard = element.querySelector('.offd__card');
    expect(freeCard?.querySelector('ui-button')).toBeNull();
    expect(freeCard?.textContent).not.toContain('Passer en Découverte');
  });

  it('renders the scheduled cancellation with a portal reactivation action', async () => {
    const { fixture, subscriptionsFacade } = await setup(
      SubscriptionTier.UNLIMITED,
      { overview: { cancelAtPeriodEnd: true, nextInvoiceDate: null } },
    );
    const element: HTMLElement = fixture.nativeElement;
    expect(texts(element, '.offd__featured-badge')).toContain(
      'Résiliation programmée',
    );
    expect(texts(element, '.offers__manage-note')[0]).toContain(
      'prend fin le 17 août 2026',
    );
    expect(
      texts(element, '.offd .offd__card-note').some((note) =>
        note.includes("Accès jusqu'au 17 août 2026"),
      ),
    ).toBe(true);
    const manage = element.querySelector('.offers__manage');
    expect(manage?.textContent).not.toContain('Résilier');
    const reactivateButton = Array.from(
      element.querySelectorAll<HTMLButtonElement>(
        '.offers__manage ui-button button',
      ),
    ).find((button) => button.textContent?.includes('Réactiver'));
    reactivateButton?.click();
    expect(subscriptionsFacade.openPortal).toHaveBeenCalledWith(
      '/abonnements',
    );
  });

  it('renders the past due alert with a portal payment method action', async () => {
    const { fixture, subscriptionsFacade } = await setup(
      SubscriptionTier.ESSENTIAL,
      { overview: { status: SubscriptionStatus.PAST_DUE } },
    );
    const element: HTMLElement = fixture.nativeElement;
    expect(texts(element, '.offd__current-badge')).toContain(
      'Paiement en échec',
    );
    const alert = element.querySelector('.offers__alert');
    expect(alert?.textContent).toContain('Paiement en échec');
    expect(alert?.textContent).toContain('Mettre à jour le moyen de paiement');
    alert
      ?.querySelector<HTMLButtonElement>('ui-button button')
      ?.click();
    expect(subscriptionsFacade.openPortal).toHaveBeenCalledWith(
      '/abonnements',
    );
  });

  it('shows the scheduled plan change on the essential card and cancels it', async () => {
    const { fixture, subscriptionsFacade } = await setup(
      SubscriptionTier.UNLIMITED,
      { overview: { pendingTier: SubscriptionTier.ESSENTIAL } },
    );
    const element: HTMLElement = fixture.nativeElement;
    expect(texts(element, '.offd__pending-date')).toContain(
      'Prend effet le 17 août 2026',
    );
    expect(
      texts(element, '.offd .offd__card-note').some((note) =>
        note.includes("Actif jusqu'au 17 août 2026"),
      ),
    ).toBe(true);
    expect(texts(element, '.offers__manage-note')[0]).toContain(
      "Passage à l'Essentiel programmé le 17 août 2026",
    );
    expect(texts(element, '.offd ui-button button')).not.toContain(
      'Choisir Essentiel',
    );
    element
      .querySelector<HTMLButtonElement>('.offd .offd__pending-cancel')
      ?.click();
    expect(subscriptionsFacade.cancelPlanChange).toHaveBeenCalledTimes(1);
  });

  it('renders the seven comparison rows', async () => {
    const { fixture } = await setup(SubscriptionTier.ESSENTIAL);
    const element: HTMLElement = fixture.nativeElement;
    const rows = element.querySelectorAll('.cmp__row:not(.cmp__row--head)');
    expect(rows).toHaveLength(7);
    expect(texts(element, '.cmp__label--desktop')[1]).toBe('Énergie par jour');
  });
});
