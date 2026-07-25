import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { EnergyStateDto, SubscriptionTier } from '@psychotech/shared';
import { of } from 'rxjs';
import { EnergyFacade } from '../../data-access/energy.facade';
import { essentialTierGuard } from '../../data-access/essential-tier.guard';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { SubscriptionsFacade } from '../../../subscriptions/data-access/subscriptions.facade';
import { Recharge } from './recharge';

function buildState(overrides: Partial<EnergyStateDto> = {}): EnergyStateDto {
  return {
    balance: 2,
    capacity: 5,
    tier: SubscriptionTier.ESSENTIAL,
    resetsAt: '2026-07-26T00:00:00.000Z',
    canStartFull: false,
    canStartAxis: true,
    ...overrides,
  };
}

async function setup(
  state: EnergyStateDto | null,
  queryParams: Record<string, string> = {},
) {
  const energyState = signal(state);
  const energyFacade = {
    state: energyState,
    load: vi.fn().mockImplementation(() => of(energyState())),
  };
  const subscriptionsFacade = {
    createEnergyCheckout: vi
      .fn()
      .mockReturnValue(of({ url: 'https://checkout.stripe.com/cs_1' })),
    getPaymentMethodOverview: vi.fn().mockReturnValue(
      of({
        card: {
          brand: 'visa',
          last4: '4242',
          expMonth: 8,
          expYear: 2027,
          wallet: null,
        },
        nextInvoiceAmount: null,
        nextInvoiceDate: null,
      }),
    ),
  };
  await TestBed.configureTestingModule({
    imports: [Recharge],
    providers: [
      provideRouter([]),
      { provide: EnergyFacade, useValue: energyFacade },
      { provide: SubscriptionsFacade, useValue: subscriptionsFacade },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { queryParamMap: convertToParamMap(queryParams) },
        },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(Recharge);
  fixture.detectChanges();
  return { fixture, energyFacade, subscriptionsFacade, energyState };
}

function text(fixture: { nativeElement: HTMLElement }): string {
  return fixture.nativeElement.textContent ?? '';
}

describe('Recharge', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('prices only the missing energies in the buy state', async () => {
    const { fixture } = await setup(buildState({ balance: 2 }));
    expect(text(fixture)).toContain('Recharger votre énergie');
    expect(text(fixture)).toContain('3 énergies créditées immédiatement');
    expect(text(fixture)).toContain('3 énergies × 0,20 €');
    expect(text(fixture)).toContain('Payer 0,60 €');
    expect(text(fixture)).toContain('4242');
  });

  it('starts the stripe checkout on pay', async () => {
    const { fixture, subscriptionsFacade } = await setup(
      buildState({ balance: 0 }),
    );
    const redirect = vi
      .spyOn(
        fixture.componentInstance as unknown as {
          openCheckout(url: string): void;
        },
        'openCheckout',
      )
      .mockImplementation(() => undefined);

    (
      fixture.nativeElement.querySelector('.rech__pay') as HTMLButtonElement
    ).click();

    expect(subscriptionsFacade.createEnergyCheckout).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith('https://checkout.stripe.com/cs_1');
    expect(
      sessionStorage.getItem('energy-recharge-pending'),
    ).toContain('1,00 €');
  });

  it('shows the full state when nothing is missing', async () => {
    const { fixture } = await setup(buildState({ balance: 5 }));
    expect(text(fixture)).toContain('Votre solde est complet');
    expect(text(fixture)).toContain('Comment ça marche');
    expect(fixture.nativeElement.querySelector('.rech__pay')).toBeNull();
  });

  it('confirms the purchase and polls the balance on the success return', async () => {
    sessionStorage.setItem(
      'energy-recharge-pending',
      JSON.stringify({ amount: '0,60 €' }),
    );
    const { fixture, energyFacade } = await setup(buildState({ balance: 5 }), {
      statut: 'succes',
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(text(fixture)).toContain('Énergie rechargée');
    expect(text(fixture)).toContain('Montant débité');
    expect(text(fixture)).toContain('0,60 €');
    expect(energyFacade.load).toHaveBeenCalled();
    expect(sessionStorage.getItem('energy-recharge-pending')).toBeNull();
  });

  it('returns to a neutral buy state on the cancel return', async () => {
    const { fixture } = await setup(buildState({ balance: 2 }), {
      statut: 'annule',
    });
    expect(text(fixture)).toContain('Recharger votre énergie');
    expect(text(fixture)).not.toContain('Énergie rechargée');
  });
});

describe('essentialTierGuard', () => {
  function runGuard(tier: SubscriptionTier) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CoreFacade, useValue: { tier: signal(tier) } },
      ],
    });
    return TestBed.runInInjectionContext(() =>
      essentialTierGuard(
        {} as never,
        {} as never,
      ),
    );
  }

  it('lets an essential user in', () => {
    expect(runGuard(SubscriptionTier.ESSENTIAL)).toBe(true);
  });

  it('redirects discovery and unlimited users to the trainings', () => {
    const tree = runGuard(SubscriptionTier.UNLIMITED);
    const router = TestBed.inject(Router);
    expect(String(tree)).toBe(String(router.createUrlTree(['/entrainements'])));
  });
});
