import { Injectable, inject } from '@angular/core';
import {
  Stripe,
  StripeEmbeddedCheckout,
  loadStripe,
} from '@stripe/stripe-js';
import { EnergyPackId, PackCheckoutStatusDto } from '@psychotech/shared';
import { Observable, firstValueFrom } from 'rxjs';
import { BillingApi } from './billing.api';

@Injectable({ providedIn: 'root' })
export class BillingFacade {
  private readonly api = inject(BillingApi);
  private stripePromise: Promise<Stripe | null> | null = null;

  async createPackCheckout(
    packId: EnergyPackId,
  ): Promise<StripeEmbeddedCheckout> {
    const stripe = await this.resolveStripe();
    const session = await firstValueFrom(this.api.createPackCheckout(packId));
    return stripe.createEmbeddedCheckoutPage({
      clientSecret: session.clientSecret,
    });
  }

  checkoutStatus(sessionId: string): Observable<PackCheckoutStatusDto> {
    return this.api.checkoutStatus(sessionId);
  }

  private async resolveStripe(): Promise<Stripe> {
    if (!this.stripePromise) {
      this.stripePromise = firstValueFrom(this.api.config()).then((config) =>
        loadStripe(config.publishableKey),
      );
    }
    const stripe = await this.stripePromise;
    if (!stripe) {
      this.stripePromise = null;
      throw new Error('Stripe could not be loaded');
    }
    return stripe;
  }
}
