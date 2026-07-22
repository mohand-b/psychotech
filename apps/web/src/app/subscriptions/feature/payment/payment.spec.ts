import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import {
  PaymentIntentKind,
  PromotionCodeDto,
  PromotionDuration,
  SubscriptionDto,
  SubscriptionTier,
} from '@psychotech/shared';
import { of, throwError } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { StripePaymentService } from '../../data-access/stripe-payment.service';
import { SubscriptionsFacade } from '../../data-access/subscriptions.facade';
import { Payment } from './payment';

const PSYCHO20: PromotionCodeDto = {
  code: 'PSYCHO20',
  percentOff: 20,
  amountOff: null,
  currency: null,
  duration: PromotionDuration.REPEATING,
  durationInMonths: 12,
};

const RAIL1MOIS: PromotionCodeDto = {
  code: 'RAIL1MOIS',
  percentOff: 100,
  amountOff: null,
  currency: null,
  duration: PromotionDuration.ONCE,
  durationInMonths: null,
};

async function setup(
  slug: string,
  tier = SubscriptionTier.FREE,
  subscription: Partial<SubscriptionDto> | null = null,
) {
  const subscriptionsFacade = {
    getBillingConfig: vi
      .fn()
      .mockReturnValue(of({ publishableKey: 'pk_test_x' })),
    createSubscription: vi.fn().mockReturnValue(
      of({ clientSecret: 'pi_secret', kind: PaymentIntentKind.PAYMENT }),
    ),
    getPromotionCode: vi.fn(),
    previewPlanChange: vi.fn().mockReturnValue(
      of({
        currentPlan: SubscriptionTier.ESSENTIAL,
        targetPlan: SubscriptionTier.UNLIMITED,
        monthlyAmount: 1499,
        currentMonthlyAmount: 899,
        prorationAmount: 410,
        prorationCharge: 810,
        prorationCredit: 400,
        nextInvoiceTotal: 1909,
        nextInvoiceDate: '2026-08-17T00:00:00.000Z',
        periodStart: '2026-07-17T00:00:00.000Z',
        card: { brand: 'visa', last4: '4242', expMonth: 8, expYear: 2028 },
      }),
    ),
    changePlan: vi.fn().mockReturnValue(of(SubscriptionTier.UNLIMITED)),
  };
  let methodChange: ((type: string) => void) | undefined;
  const stripePayment = {
    init: vi.fn().mockResolvedValue(undefined),
    mount: vi.fn(
      (
        _host: HTMLElement,
        _amount: number,
        onReady: () => void,
        _onLoadError: (message: string | null) => void,
        onMethodChange?: (type: string) => void,
      ) => {
        methodChange = onMethodChange;
        onReady();
      },
    ),
    updateAmount: vi.fn(),
    validateForm: vi.fn().mockResolvedValue({ errorMessage: null }),
    confirm: vi.fn().mockResolvedValue({ errorMessage: null }),
    selectMethod: (type: string) => methodChange?.(type),
  };
  TestBed.overrideComponent(Payment, {
    set: {
      providers: [{ provide: StripePaymentService, useValue: stripePayment }],
    },
  });
  await TestBed.configureTestingModule({
    imports: [Payment],
    providers: [
      provideRouter([]),
      { provide: CoreFacade, useValue: { tier: signal(tier) } },
      {
        provide: AuthFacade,
        useValue: {
          currentUser: signal({ email: 'alice@example.com', subscription }),
        },
      },
      { provide: SubscriptionsFacade, useValue: subscriptionsFacade },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ plan: slug }) } },
      },
    ],
  }).compileComponents();
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const navigateByUrl = vi
    .spyOn(router, 'navigateByUrl')
    .mockResolvedValue(true);
  const fixture = TestBed.createComponent(Payment);
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
  return { fixture, subscriptionsFacade, stripePayment, navigate, navigateByUrl };
}

function text(fixture: { nativeElement: HTMLElement }, selector: string) {
  return (
    fixture.nativeElement
      .querySelector(selector)
      ?.textContent?.replace(/ /g, ' ')
      .trim() ?? ''
  );
}

function texts(
  fixture: { nativeElement: HTMLElement },
  selector: string,
): string[] {
  return Array.from(fixture.nativeElement.querySelectorAll(selector)).map(
    (node) => node.textContent?.replace(/[ ]/g, ' ').trim() ?? '',
  );
}

function applyCode(
  fixture: { nativeElement: HTMLElement; detectChanges(): void },
  code: string,
) {
  const input =
    fixture.nativeElement.querySelector<HTMLInputElement>('.pay__promo-input');
  if (!input) {
    throw new Error('promo input not found');
  }
  input.value = code;
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  fixture.nativeElement
    .querySelector<HTMLButtonElement>('.pay__promo-apply')
    ?.click();
  fixture.detectChanges();
}

describe('Payment', () => {
  it('shows the plan summary and mounts the payment element', async () => {
    const { fixture, stripePayment } = await setup('essentiel');
    expect(text(fixture, '.pay__offer-name')).toBe('Essentiel');
    expect(text(fixture, '.pay__offer-amount')).toBe('8,99 €');
    expect(text(fixture, '.pay__cta')).toBe("Payer 8,99 € et s'abonner");
    expect(stripePayment.init).toHaveBeenCalledWith('pk_test_x');
    expect(stripePayment.mount).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      899,
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('shows the cardholder field for the card method only', async () => {
    const { fixture, stripePayment } = await setup('essentiel');
    const holder = () =>
      fixture.nativeElement.querySelector('.pay__holder-input');
    expect(holder()).not.toBeNull();

    stripePayment.selectMethod('klarna');
    fixture.detectChanges();
    expect(holder()).toBeNull();

    stripePayment.selectMethod('card');
    fixture.detectChanges();
    expect(holder()).not.toBeNull();
  });

  it('redirects an unknown plan slug to the offers page', async () => {
    const { navigate } = await setup('premium');
    expect(navigate).toHaveBeenCalledWith(['/abonnements']);
  });

  it('redirects a user already on the requested plan to the offers page', async () => {
    const { navigate } = await setup('essentiel', SubscriptionTier.ESSENTIAL);
    expect(navigate).toHaveBeenCalledWith(['/abonnements']);
  });

  it('shows the prorated change summary for a subscribed user', async () => {
    const { fixture, stripePayment } = await setup(
      'illimite',
      SubscriptionTier.ESSENTIAL,
    );
    expect(text(fixture, '.pay__title')).toBe("Changer d'offre");
    expect(texts(fixture, '.chg__box-amount')).toEqual(['8,99 €', '14,99 €']);
    expect(
      texts(fixture, '.pay__total-value').some((value) =>
        value.includes('8,10 €'),
      ),
    ).toBe(true);
    expect(
      texts(fixture, '.pay__total-value').some((value) =>
        value.includes('−4,00 €'),
      ),
    ).toBe(true);
    expect(text(fixture, '.pay__total-due')).toBe("À payer aujourd'hui");
    expect(text(fixture, '.pay__total-amount')).toBe('4,10 €');
    expect(text(fixture, '.chg__pm-last4')).toContain('4242');
    expect(text(fixture, '.pay__cta')).toBe('Confirmer et payer 4,10 €');
    expect(stripePayment.mount).not.toHaveBeenCalled();
  });

  it('redirects when the requested change is already scheduled', async () => {
    const { navigate, subscriptionsFacade } = await setup(
      'essentiel',
      SubscriptionTier.UNLIMITED,
      { pendingTier: SubscriptionTier.ESSENTIAL },
    );
    expect(navigate).toHaveBeenCalledWith(['/abonnements']);
    expect(subscriptionsFacade.previewPlanChange).not.toHaveBeenCalled();
  });

  it('announces that a scheduled cancellation is lifted by the change', async () => {
    const { fixture } = await setup('illimite', SubscriptionTier.ESSENTIAL, {
      cancelAtPeriodEnd: true,
    });
    const notes = texts(fixture, '.chg__effect');
    expect(
      notes.some((note) =>
        note.includes('Votre résiliation programmée est annulée'),
      ),
    ).toBe(true);
  });

  it('confirms the plan change and lands on the confirmation page', async () => {
    const { fixture, subscriptionsFacade, navigate } = await setup(
      'illimite',
      SubscriptionTier.ESSENTIAL,
    );

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.pay__cta button')
      ?.click();
    await fixture.whenStable();

    expect(subscriptionsFacade.changePlan).toHaveBeenCalledWith(
      SubscriptionTier.UNLIMITED,
    );
    expect(navigate).toHaveBeenCalledWith(['/abonnement-confirme'], {
      queryParams: { offre: 'illimite', mode: 'changement' },
    });
  });

  it('applies a percent promotion and updates the element amount', async () => {
    const { fixture, subscriptionsFacade, stripePayment } =
      await setup('illimite');
    subscriptionsFacade.getPromotionCode.mockReturnValue(of(PSYCHO20));

    applyCode(fixture, 'PSYCHO20');

    expect(text(fixture, '.pay__promo-label')).toBe('−20 % pendant 12 mois');
    expect(text(fixture, '.pay__total-amount')).toBe('11,99 €');
    expect(text(fixture, '.pay__total-row--discount .pay__total-value')).toBe(
      '−3,00 €',
    );
    expect(stripePayment.updateAmount).toHaveBeenCalledWith(1199);
  });

  it('switches to a zero total for a free first month', async () => {
    const { fixture, subscriptionsFacade, stripePayment } =
      await setup('essentiel');
    subscriptionsFacade.getPromotionCode.mockReturnValue(of(RAIL1MOIS));

    applyCode(fixture, 'RAIL1MOIS');

    expect(text(fixture, '.pay__promo-label')).toBe('1er mois offert');
    expect(text(fixture, '.pay__total-amount')).toBe('0,00 €');
    expect(text(fixture, '.pay__cta')).toBe("S'abonner — 0,00 € aujourd'hui");
    expect(stripePayment.updateAmount).toHaveBeenCalledWith(0);
  });

  it('shows an error for an invalid code', async () => {
    const { fixture, subscriptionsFacade } = await setup('essentiel');
    subscriptionsFacade.getPromotionCode.mockReturnValue(
      throwError(() => new Error('not found')),
    );

    applyCode(fixture, 'NOPE');

    expect(text(fixture, '.pay__promo-error')).toContain(
      "n'est pas valide ou a expiré",
    );
  });

  it('confirms the payment on the page and lands on the confirmation page', async () => {
    const { fixture, subscriptionsFacade, stripePayment, navigate } =
      await setup('illimite');
    subscriptionsFacade.getPromotionCode.mockReturnValue(of(PSYCHO20));
    applyCode(fixture, 'PSYCHO20');

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.pay__cta button')
      ?.click();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(subscriptionsFacade.createSubscription).toHaveBeenCalledWith(
      SubscriptionTier.UNLIMITED,
      'PSYCHO20',
    );
    expect(stripePayment.confirm).toHaveBeenCalledWith(
      PaymentIntentKind.PAYMENT,
      'pi_secret',
      expect.stringContaining('/abonnement-confirme?offre=illimite'),
      '',
      'alice@example.com',
    );
    expect(navigate).toHaveBeenCalledWith(['/abonnement-confirme'], {
      queryParams: { offre: 'illimite' },
    });
  });

  it('surfaces a failed confirmation without leaving the page', async () => {
    const { fixture, stripePayment, navigateByUrl } = await setup('essentiel');
    stripePayment.confirm.mockResolvedValue({
      errorMessage: 'Votre carte a été refusée.',
    });

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.pay__cta button')
      ?.click();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(text(fixture, '.pay__stripe .pay__promo-error')).toContain(
      'Votre carte a été refusée.',
    );
  });
});
