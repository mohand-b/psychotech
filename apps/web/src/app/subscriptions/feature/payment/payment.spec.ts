import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import {
  PromotionCodeDto,
  PromotionDuration,
  SubscriptionTier,
} from '@psychotech/shared';
import { EMPTY, of, throwError } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { CoreFacade } from '../../../core/data-access/core.facade';
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

async function setup(slug: string, tier = SubscriptionTier.FREE) {
  const subscriptionsFacade = {
    startCheckout: vi.fn().mockReturnValue(EMPTY),
    validatePromotionCode: vi.fn(),
  };
  await TestBed.configureTestingModule({
    imports: [Payment],
    providers: [
      provideRouter([]),
      { provide: CoreFacade, useValue: { tier: signal(tier) } },
      {
        provide: AuthFacade,
        useValue: { currentUser: signal({ email: 'alice@example.com' }) },
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
  const fixture = TestBed.createComponent(Payment);
  fixture.detectChanges();
  return { fixture, subscriptionsFacade, navigate };
}

function text(fixture: { nativeElement: HTMLElement }, selector: string) {
  return (
    fixture.nativeElement
      .querySelector(selector)
      ?.textContent?.replace(/ /g, ' ')
      .trim() ?? ''
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
  it('shows the essential plan summary and price', async () => {
    const { fixture } = await setup('essentiel');
    expect(text(fixture, '.pay__offer-name')).toBe('Essentiel');
    expect(text(fixture, '.pay__offer-amount')).toBe('8,99 €');
    expect(text(fixture, '.pay__total-amount')).toBe('8,99 €');
  });

  it('redirects an unknown plan slug to the offers page', async () => {
    const { navigate } = await setup('premium');
    expect(navigate).toHaveBeenCalledWith(['/abonnements']);
  });

  it('redirects an already subscribed user to the offers page', async () => {
    const { navigate } = await setup('essentiel', SubscriptionTier.ESSENTIAL);
    expect(navigate).toHaveBeenCalledWith(['/abonnements']);
  });

  it('applies a percent promotion to the total', async () => {
    const { fixture, subscriptionsFacade } = await setup('illimite');
    subscriptionsFacade.validatePromotionCode.mockReturnValue(of(PSYCHO20));

    applyCode(fixture, 'PSYCHO20');

    expect(subscriptionsFacade.validatePromotionCode).toHaveBeenCalledWith(
      'PSYCHO20',
    );
    expect(text(fixture, '.pay__promo-code')).toBe('PSYCHO20');
    expect(text(fixture, '.pay__promo-label')).toBe('−20 % pendant 12 mois');
    expect(text(fixture, '.pay__total-amount')).toBe('11,99 €');
    expect(text(fixture, '.pay__total-row--discount .pay__total-value')).toBe(
      '−3,00 €',
    );
  });

  it('drops the total to zero for a free first month', async () => {
    const { fixture, subscriptionsFacade } = await setup('essentiel');
    subscriptionsFacade.validatePromotionCode.mockReturnValue(of(RAIL1MOIS));

    applyCode(fixture, 'RAIL1MOIS');

    expect(text(fixture, '.pay__promo-label')).toBe('1er mois offert');
    expect(text(fixture, '.pay__total-amount')).toBe('0,00 €');
    expect(
      fixture.nativeElement.querySelector('.pay__total-row--discount'),
    ).toBeNull();
  });

  it('shows an error for an invalid code', async () => {
    const { fixture, subscriptionsFacade } = await setup('essentiel');
    subscriptionsFacade.validatePromotionCode.mockReturnValue(
      throwError(() => new Error('not found')),
    );

    applyCode(fixture, 'NOPE');

    expect(text(fixture, '.pay__promo-error')).toContain(
      "n'est pas valide ou a expiré",
    );
  });

  it('starts the checkout with the applied promotion code', async () => {
    const { fixture, subscriptionsFacade } = await setup('illimite');
    subscriptionsFacade.validatePromotionCode.mockReturnValue(of(PSYCHO20));
    applyCode(fixture, 'PSYCHO20');

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.pay__cta button')
      ?.click();

    expect(subscriptionsFacade.startCheckout).toHaveBeenCalledWith(
      SubscriptionTier.UNLIMITED,
      'PSYCHO20',
    );
  });
});
