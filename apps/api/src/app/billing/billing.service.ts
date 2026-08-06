import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  BillingConfigDto,
  ENERGY_PACK_BY_ID,
  EnergyPackId,
  PackCheckoutSessionDto,
  PackCheckoutState,
  PackCheckoutStatusDto,
} from '@psychotech/shared';
import { BillingConfig } from '../config/billing.config';
import { EnergyService } from '../energy/energy.service';
import { BillingRepository } from './billing.repository';
import { STRIPE_CLIENT } from './stripe.client';

@Injectable()
export class BillingService {
  private readonly config: BillingConfig;

  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe | null,
    private readonly repository: BillingRepository,
    private readonly energyService: EnergyService,
    private readonly configService: ConfigService,
  ) {
    this.config = this.configService.getOrThrow<BillingConfig>('billing');
  }

  getConfig(): BillingConfigDto {
    if (!this.config.enabled || !this.config.publishableKey) {
      throw new ServiceUnavailableException('Billing is not configured');
    }
    return { publishableKey: this.config.publishableKey };
  }

  async createPackCheckout(
    userId: string,
    packId: EnergyPackId,
  ): Promise<PackCheckoutSessionDto> {
    const stripe = this.requireStripe();
    const pack = ENERGY_PACK_BY_ID.get(packId);
    if (!pack) {
      throw new BadRequestException('Unknown energy pack');
    }
    const priceId = this.config.packPriceIds[packId];
    const appBaseUrl = this.config.appBaseUrl;
    if (!priceId || !appBaseUrl) {
      throw new ServiceUnavailableException('Billing is not configured');
    }
    const customerId = await this.resolveCustomerId(stripe, userId);
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded_page',
      mode: 'payment',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId, packId },
      saved_payment_method_options: { payment_method_save: 'enabled' },
      return_url: `${appBaseUrl}/energie?session_id={CHECKOUT_SESSION_ID}`,
    });
    if (!session.client_secret) {
      throw new ServiceUnavailableException(
        'Stripe did not return a checkout client secret',
      );
    }
    return { clientSecret: session.client_secret };
  }

  async getPackCheckoutStatus(
    userId: string,
    sessionId: string,
  ): Promise<PackCheckoutStatusDto> {
    const stripe = this.requireStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.userId !== userId) {
      throw new NotFoundException('Checkout session not found');
    }
    const status: PackCheckoutState =
      session.status === 'complete'
        ? 'complete'
        : session.status === 'expired'
          ? 'expired'
          : 'open';
    const credited =
      status === 'complete'
        ? await this.energyService.hasCreditForRef(userId, session.id)
        : false;
    return { status, credited };
  }

  async handleWebhook(
    payload: Buffer | undefined,
    signature: string | undefined,
  ): Promise<void> {
    const stripe = this.requireStripe();
    if (!payload || !signature || !this.config.webhookSecret) {
      throw new BadRequestException('Missing webhook signature material');
    }
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret,
      );
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }
    if (event.type === 'checkout.session.completed') {
      await this.handleCheckoutCompleted(event);
      return;
    }
    await this.repository.registerEvent(event.id);
  }

  private async handleCheckoutCompleted(event: Stripe.Event): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const packId = session.metadata?.packId as EnergyPackId | undefined;
    const pack = packId ? ENERGY_PACK_BY_ID.get(packId) : undefined;
    if (!userId || !pack || session.payment_status !== 'paid') {
      await this.repository.registerEvent(event.id);
      return;
    }
    await this.repository.creditPackPurchaseOnce(
      event.id,
      userId,
      pack.energyAmount,
      session.id,
    );
  }

  private async resolveCustomerId(
    stripe: Stripe,
    userId: string,
  ): Promise<string> {
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      metadata: { userId },
    });
    await this.repository.saveStripeCustomerId(userId, customer.id);
    return customer.id;
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Billing is not configured');
    }
    return this.stripe;
  }
}
