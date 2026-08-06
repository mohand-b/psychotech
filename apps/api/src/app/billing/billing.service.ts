import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { BillingConfigDto } from '@psychotech/shared';
import { BillingConfig } from '../config/billing.config';
import { BillingRepository } from './billing.repository';
import { STRIPE_CLIENT } from './stripe.client';

@Injectable()
export class BillingService {
  private readonly config: BillingConfig;

  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe | null,
    private readonly repository: BillingRepository,
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

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Billing is not configured');
    }
    return this.stripe;
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
    await this.repository.registerEvent(event.id);
  }
}
