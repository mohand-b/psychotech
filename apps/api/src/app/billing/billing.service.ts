import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  BillingRedirectDto,
  PaidTier,
  PromotionCodeDto,
} from '@psychotech/shared';
import { BillingConfig } from '../config/billing.config';
import {
  mapStripeSubscriptionStatus,
  PriceCatalog,
  priceForPlan,
  tierForPrice,
  toPromotionCodeDto,
} from './billing.logic';
import { BillingRepository } from './billing.repository';
import { STRIPE_CLIENT } from './stripe.client';

const HANDLED_SUBSCRIPTION_EVENTS = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
] as const;

@Injectable()
export class BillingService {
  private readonly config: BillingConfig;
  private portalConfigurationId: string | null = null;

  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe | null,
    private readonly repository: BillingRepository,
    configService: ConfigService,
  ) {
    this.config = configService.getOrThrow<BillingConfig>('billing');
  }

  async createCheckoutSession(
    userId: string,
    plan: PaidTier,
    origin: string,
    promotionCode?: string,
  ): Promise<BillingRedirectDto> {
    const stripe = this.requireStripe();
    const customerId = await this.ensureCustomer(stripe, userId);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: priceForPlan(plan, this.catalog()), quantity: 1 }],
      discounts: promotionCode
        ? [
            {
              promotion_code: (
                await this.requirePromotionCode(stripe, promotionCode)
              ).id,
            },
          ]
        : undefined,
      success_url: `${origin}/abonnements?checkout=success`,
      cancel_url: `${origin}/abonnements?checkout=cancelled`,
    });
    if (!session.url) {
      throw new ServiceUnavailableException('Stripe returned no checkout URL');
    }
    return { url: session.url };
  }

  async findPromotionCode(code: string): Promise<PromotionCodeDto> {
    const stripe = this.requireStripe();
    const promotion = await this.lookupPromotionCode(stripe, code);
    if (!promotion) {
      throw new NotFoundException('Unknown or expired promotion code');
    }
    return toPromotionCodeDto(promotion.code, this.couponOf(promotion));
  }

  private async requirePromotionCode(
    stripe: Stripe,
    code: string,
  ): Promise<Stripe.PromotionCode> {
    const promotion = await this.lookupPromotionCode(stripe, code);
    if (!promotion) {
      throw new BadRequestException('Unknown or expired promotion code');
    }
    return promotion;
  }

  private async lookupPromotionCode(
    stripe: Stripe,
    code: string,
  ): Promise<Stripe.PromotionCode | null> {
    const list = await stripe.promotionCodes.list({
      code,
      active: true,
      limit: 1,
      expand: ['data.promotion.coupon'],
    });
    const promotion = list.data[0];
    if (!promotion || !promotion.active) {
      return null;
    }
    const coupon = promotion.promotion.coupon;
    return typeof coupon === 'object' && coupon !== null && coupon.valid
      ? promotion
      : null;
  }

  private couponOf(promotion: Stripe.PromotionCode): Stripe.Coupon {
    return promotion.promotion.coupon as Stripe.Coupon;
  }

  async createPortalSession(
    userId: string,
    origin: string,
  ): Promise<BillingRedirectDto> {
    const stripe = this.requireStripe();
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.stripeCustomerId) {
      throw new ForbiddenException('No billing account for this user');
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      configuration: await this.ensurePortalConfiguration(stripe),
      return_url: `${origin}/abonnements`,
    });
    return { url: session.url };
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
    if (!(await this.repository.registerEvent(event.id))) {
      return;
    }
    if (event.type === 'checkout.session.completed') {
      await this.onCheckoutCompleted(stripe, event.data.object);
      return;
    }
    if (
      (HANDLED_SUBSCRIPTION_EVENTS as readonly string[]).includes(event.type)
    ) {
      await this.applySubscription(event.data.object as Stripe.Subscription);
    }
  }

  private async onCheckoutCompleted(
    stripe: Stripe,
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    if (session.mode !== 'subscription' || !session.subscription) {
      return;
    }
    const subscription =
      typeof session.subscription === 'string'
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;
    await this.applySubscription(
      subscription,
      session.client_reference_id ?? undefined,
    );
  }

  private async applySubscription(
    subscription: Stripe.Subscription,
    knownUserId?: string,
  ): Promise<void> {
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;
    const userId =
      knownUserId ??
      (await this.repository.findUserIdByStripeCustomerId(customerId));
    if (!userId) {
      return;
    }
    const item = subscription.items.data[0];
    const tier = item ? tierForPrice(item.price.id, this.catalog()) : null;
    if (!tier) {
      return;
    }
    await this.repository.upsertSubscription(userId, {
      stripeSubscriptionId: subscription.id,
      tier,
      status: mapStripeSubscriptionStatus(subscription.status),
      currentPeriodEnd: item.current_period_end
        ? new Date(item.current_period_end * 1000)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  }

  private async ensureCustomer(
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

  private async ensurePortalConfiguration(stripe: Stripe): Promise<string> {
    if (this.portalConfigurationId) {
      return this.portalConfigurationId;
    }
    const existing = await stripe.billingPortal.configurations.list({
      active: true,
      limit: 1,
    });
    if (existing.data.length > 0) {
      this.portalConfigurationId = existing.data[0].id;
      return this.portalConfigurationId;
    }
    const catalog = this.catalog();
    const [essential, unlimited] = await Promise.all([
      stripe.prices.retrieve(catalog.priceEssential),
      stripe.prices.retrieve(catalog.priceUnlimited),
    ]);
    const created = await stripe.billingPortal.configurations.create({
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true, mode: 'at_period_end' },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price'],
          products: [
            {
              product: this.productId(essential),
              prices: [essential.id],
            },
            {
              product: this.productId(unlimited),
              prices: [unlimited.id],
            },
          ],
        },
      },
    });
    this.portalConfigurationId = created.id;
    return this.portalConfigurationId;
  }

  private productId(price: Stripe.Price): string {
    return typeof price.product === 'string' ? price.product : price.product.id;
  }

  private catalog(): PriceCatalog {
    if (!this.config.priceEssential || !this.config.priceUnlimited) {
      throw new ServiceUnavailableException('Stripe prices are not configured');
    }
    return {
      priceEssential: this.config.priceEssential,
      priceUnlimited: this.config.priceUnlimited,
    };
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Billing is disabled in this environment',
      );
    }
    return this.stripe;
  }
}
