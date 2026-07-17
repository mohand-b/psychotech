import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { PaymentIntentKind } from '@psychotech/shared';
import {
  Appearance,
  Stripe,
  StripeElements,
  loadStripe,
} from '@stripe/stripe-js';

export interface PaymentConfirmation {
  errorMessage: string | null;
}

const INTER_FONT_CSS =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';

@Injectable()
export class StripePaymentService {
  private readonly document = inject(DOCUMENT);
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;

  async init(publishableKey: string): Promise<void> {
    this.stripe ??= await loadStripe(publishableKey);
  }

  mount(container: HTMLElement, amountCents: number): void {
    const stripe = this.requireStripe();
    this.elements = stripe.elements({
      ...this.intentOptions(amountCents),
      appearance: this.appearance(),
      fonts: [{ cssSrc: INTER_FONT_CSS }],
      locale: 'fr',
    });
    this.elements.create('payment', { layout: 'tabs' }).mount(container);
  }

  updateAmount(amountCents: number): void {
    this.elements?.update(this.intentOptions(amountCents));
  }

  async submit(): Promise<PaymentConfirmation> {
    const elements = this.requireElements();
    const { error } = await elements.submit();
    return { errorMessage: error?.message ?? null };
  }

  async confirm(
    kind: PaymentIntentKind,
    clientSecret: string,
    returnUrl: string,
    billingName: string,
    billingEmail: string,
  ): Promise<PaymentConfirmation> {
    const stripe = this.requireStripe();
    const elements = this.requireElements();
    const params = {
      elements,
      clientSecret,
      confirmParams: {
        return_url: returnUrl,
        payment_method_data: {
          billing_details: {
            name: billingName,
            email: billingEmail,
          },
        },
      },
      redirect: 'if_required' as const,
    };
    const { error } =
      kind === PaymentIntentKind.SETUP
        ? await stripe.confirmSetup(params)
        : await stripe.confirmPayment(params);
    return { errorMessage: error?.message ?? null };
  }

  private intentOptions(amountCents: number) {
    return amountCents > 0
      ? ({ mode: 'subscription', amount: amountCents, currency: 'eur' } as const)
      : ({ mode: 'setup', currency: 'eur' } as const);
  }

  private appearance(): Appearance {
    const token = (name: string) =>
      getComputedStyle(this.document.documentElement)
        .getPropertyValue(name)
        .trim();
    return {
      variables: {
        fontFamily: 'Inter, sans-serif',
        fontSizeBase: '14.5px',
        colorPrimary: token('--brand'),
        colorText: token('--ink'),
        colorTextSecondary: token('--text-secondary'),
        colorTextPlaceholder: token('--text-disabled'),
        colorDanger: token('--danger-text'),
        colorBackground: token('--card'),
        borderRadius: '10px',
      },
      rules: {
        '.Input': {
          border: `1px solid ${token('--border')}`,
          boxShadow: 'none',
          padding: '14px',
        },
        '.Input:focus': {
          border: `1px solid ${token('--brand')}`,
          boxShadow: `0 0 0 3px color-mix(in srgb, ${token('--brand')} 12%, transparent)`,
        },
        '.Label': {
          fontSize: '11px',
          fontWeight: '600',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: token('--label'),
        },
        '.Tab': {
          border: `1px solid ${token('--border')}`,
          boxShadow: 'none',
        },
      },
    };
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new Error('Stripe is not initialized');
    }
    return this.stripe;
  }

  private requireElements(): StripeElements {
    if (!this.elements) {
      throw new Error('Stripe elements are not mounted');
    }
    return this.elements;
  }
}
