import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import {
  ENERGY_NO_PAYMENT_METHOD_ERROR_CODE,
  EnergyStateDto,
  SubscriptionTier,
} from '@psychotech/shared';
import { Observable, of, throwError } from 'rxjs';
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
    resetsAt: '2026-07-27T00:00:00.000Z',
    canStartFull: false,
    canStartAxis: true,
    ...overrides,
  };
}

async function setup(
  state: EnergyStateDto | null,
  options: { refill?: () => Observable<void> } = {},
) {
  const energyState = signal(state);
  const energyFacade = {
    state: energyState,
    load: vi.fn().mockImplementation(() => of(energyState())),
  };
  const subscriptionsFacade = {
    createEnergyRefill: vi.fn(options.refill ?? (() => of(undefined))),
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
  it('sells the one-euro refill back to five in the buy state', async () => {
    const { fixture } = await setup(buildState({ balance: 2 }));
    expect(text(fixture)).toContain('Recharger votre énergie');
    expect(text(fixture)).toContain("Recharge jusqu'à 5 énergies");
    expect(text(fixture)).toContain('Votre solde revient à 5 immédiatement');
    expect(text(fixture)).toContain('Remise à 5 énergies');
    expect(text(fixture)).toContain('Payer 1,00 €');
    expect(text(fixture)).toContain('4242');
    const chips = Array.from(
      fixture.nativeElement.querySelectorAll('.rech__balance-value'),
    ).map((chip) => (chip as HTMLElement).textContent?.trim());
    expect(chips).toEqual(['2/5', '5/5']);
  });

  it('charges in place and confirms once the balance is credited', async () => {
    const { fixture, subscriptionsFacade, energyFacade, energyState } =
      await setup(buildState({ balance: 0 }));

    (
      fixture.nativeElement.querySelector('.rech__pay') as HTMLButtonElement
    ).click();
    energyState.set(buildState({ balance: 5, canStartFull: true }));
    await new Promise((resolve) => setTimeout(resolve, 10));
    fixture.detectChanges();

    expect(subscriptionsFacade.createEnergyRefill).toHaveBeenCalledTimes(1);
    expect(energyFacade.load).toHaveBeenCalled();
    expect(text(fixture)).toContain('Énergie rechargée');
    expect(text(fixture)).toContain('Montant débité');
    expect(text(fixture)).toContain('1,00 €');
  });

  it('shows the typed error when no card is saved', async () => {
    const { fixture } = await setup(buildState({ balance: 0 }), {
      refill: () =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { message: ENERGY_NO_PAYMENT_METHOD_ERROR_CODE },
            }),
        ),
    });

    (
      fixture.nativeElement.querySelector('.rech__pay') as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(text(fixture)).toContain(
      'Ajoutez d’abord une carte pour recharger votre énergie.',
    );
    expect(
      fixture.nativeElement.querySelector('.rech__pay')?.textContent,
    ).toContain('Payer 1,00 €');
  });

  it('shows the full state when nothing is missing', async () => {
    const { fixture } = await setup(buildState({ balance: 5 }));
    expect(text(fixture)).toContain('Votre solde est complet');
    expect(text(fixture)).toContain('Comment ça marche');
    expect(fixture.nativeElement.querySelector('.rech__pay')).toBeNull();
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
      essentialTierGuard({} as never, {} as never),
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
