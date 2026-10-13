import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ENERGY_PACK_BY_ID,
  EnergyPackId,
  GOOGLE_PLAY_PRODUCT_IDS,
  GooglePlayPurchaseResultDto,
} from '@psychotech/shared';
import { BillingRepository } from '../billing.repository';
import {
  GooglePlayClient,
  GooglePlayConsumptionState,
  GooglePlayProductPurchase,
  GooglePlayPurchaseState,
  GooglePlayRequestError,
} from './google-play.client';

const UNKNOWN_PURCHASE_STATUSES: readonly number[] = [400, 404, 410];

@Injectable()
export class GooglePlayBillingService {
  private readonly logger = new Logger(GooglePlayBillingService.name);

  constructor(
    private readonly client: GooglePlayClient,
    private readonly repository: BillingRepository,
  ) {}

  async creditPurchase(
    userId: string,
    packId: EnergyPackId,
    purchaseToken: string,
  ): Promise<GooglePlayPurchaseResultDto> {
    if (!this.client.isConfigured()) {
      throw new ServiceUnavailableException(
        'Google Play billing is not configured',
      );
    }
    const pack = ENERGY_PACK_BY_ID.get(packId);
    if (!pack) {
      throw new BadRequestException('Unknown energy pack');
    }
    const productId = GOOGLE_PLAY_PRODUCT_IDS[pack.id];
    const purchase = await this.fetchPurchase(productId, purchaseToken);
    if (purchase.purchaseState === GooglePlayPurchaseState.PENDING) {
      return { status: 'pending' };
    }
    if (purchase.purchaseState !== GooglePlayPurchaseState.PURCHASED) {
      throw new BadRequestException('Google Play purchase is not completed');
    }
    const credited = await this.repository.creditGooglePlayPurchaseOnce({
      userId,
      packId: pack.id,
      energyAmount: pack.energyAmount,
      amountCents: pack.priceCents,
      purchaseToken,
    });
    if (
      !credited &&
      (await this.repository.findPurchaseOwnerId(purchaseToken)) !== userId
    ) {
      throw new ForbiddenException(
        'Google Play purchase belongs to another account',
      );
    }
    if (purchase.consumptionState === GooglePlayConsumptionState.NOT_CONSUMED) {
      await this.consumePurchase(productId, purchaseToken);
    }
    return { status: 'credited' };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async revokeVoidedPurchases(): Promise<void> {
    if (!this.client.isConfigured()) {
      return;
    }
    try {
      const voidedPurchases = await this.client.listVoidedPurchases();
      for (const voidedPurchase of voidedPurchases) {
        const revoked = await this.repository.revokeGooglePlayPurchaseOnce(
          voidedPurchase.purchaseToken,
          new Date(Number(voidedPurchase.voidedTimeMillis)),
        );
        if (revoked) {
          this.logger.log(
            'Revoked the credits of a refunded Google Play purchase',
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Voided Google Play purchases check failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async fetchPurchase(
    productId: string,
    purchaseToken: string,
  ): Promise<GooglePlayProductPurchase> {
    try {
      return await this.client.fetchProductPurchase(productId, purchaseToken);
    } catch (error) {
      if (
        error instanceof GooglePlayRequestError &&
        UNKNOWN_PURCHASE_STATUSES.includes(error.status)
      ) {
        throw new BadRequestException('Unknown Google Play purchase');
      }
      this.logger.error(
        'Google Play purchase verification failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        'Google Play purchase verification is unavailable',
      );
    }
  }

  private async consumePurchase(
    productId: string,
    purchaseToken: string,
  ): Promise<void> {
    try {
      await this.client.consumeProductPurchase(productId, purchaseToken);
    } catch (error) {
      this.logger.error(
        'Google Play purchase consumption failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
