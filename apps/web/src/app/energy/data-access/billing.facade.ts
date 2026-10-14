import { Injectable, inject } from '@angular/core';
import { Stripe, StripeEmbeddedCheckout, loadStripe } from '@stripe/stripe-js';
import {
  EnergyPackId,
  GooglePlayPurchaseStatus,
  PackCheckoutStatusDto,
} from '@psychotech/shared';
import { Observable, firstValueFrom } from 'rxjs';
import { BillingApi } from './billing.api';
import { GooglePlayBilling } from './google-play-billing';

@Injectable({ providedIn: 'root' })
export class BillingFacade {
  private readonly api = inject(BillingApi);
  private readonly googlePlayBilling = inject(GooglePlayBilling);
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

  fetchCheckoutStatus(sessionId: string): Observable<PackCheckoutStatusDto> {
    return this.api.fetchCheckoutStatus(sessionId);
  }

  fetchGooglePlayPackPrices(): Promise<ReadonlyMap<
    EnergyPackId,
    string
  > | null> {
    return this.googlePlayBilling.fetchPackPrices();
  }

  isRunningInGoogleChrome(): boolean {
    return this.googlePlayBilling.isRunningInGoogleChrome();
  }

  async purchasePackWithGooglePlay(
    packId: EnergyPackId,
  ): Promise<GooglePlayPurchaseStatus> {
    const payment = await this.googlePlayBilling.payForPack(packId);
    try {
      const result = await firstValueFrom(
        this.api.creditGooglePlayPurchase({
          packId: payment.packId,
          purchaseToken: payment.purchaseToken,
        }),
      );
      await payment.complete(true);
      return result.status;
    } catch (error) {
      await payment.complete(false);
      throw error;
    }
  }

  async recoverGooglePlayPurchases(): Promise<boolean> {
    const ownedPacks = await this.googlePlayBilling.listOwnedPacks();
    const results = await Promise.allSettled(
      ownedPacks.map((ownedPack) =>
        firstValueFrom(this.api.creditGooglePlayPurchase(ownedPack)),
      ),
    );
    return results.some(
      (result) =>
        result.status === 'fulfilled' && result.value.status === 'credited',
    );
  }

  private async resolveStripe(): Promise<Stripe> {
    if (!this.stripePromise) {
      this.stripePromise = firstValueFrom(this.api.fetchBillingConfig()).then(
        (config) => loadStripe(config.publishableKey),
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
