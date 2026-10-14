import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import {
  ENERGY_PACK_ID_BY_GOOGLE_PLAY_PRODUCT_ID,
  EnergyPackId,
  GOOGLE_PLAY_BILLING_METHOD,
  GOOGLE_PLAY_PRODUCT_IDS,
} from '@psychotech/shared';

const PRICE_LOCALE = 'fr-FR';
const PAYMENT_TOTAL_LABEL = 'Total';
const PAYMENT_PLACEHOLDER_AMOUNT = { currency: 'EUR', value: '0' };
const GOOGLE_CHROME_BRAND = 'Google Chrome';

interface DigitalGoodsPrice {
  currency: string;
  value: string;
}

interface DigitalGoodsItemDetails {
  itemId: string;
  price: DigitalGoodsPrice;
}

interface DigitalGoodsPurchaseDetails {
  itemId: string;
  purchaseToken: string;
}

interface DigitalGoodsService {
  getDetails(itemIds: string[]): Promise<DigitalGoodsItemDetails[]>;
  listPurchases(): Promise<DigitalGoodsPurchaseDetails[]>;
}

interface DigitalGoodsWindow {
  getDigitalGoodsService?: (
    paymentMethod: string,
  ) => Promise<DigitalGoodsService>;
}

interface UserAgentBrand {
  brand: string;
}

interface UserAgentDataNavigator {
  userAgentData?: { brands: readonly UserAgentBrand[] };
}

interface GooglePlayPaymentDetails {
  purchaseToken: string;
}

export interface GooglePlayPackPayment {
  packId: EnergyPackId;
  purchaseToken: string;
  complete(succeeded: boolean): Promise<void>;
}

export interface GooglePlayOwnedPack {
  packId: EnergyPackId;
  purchaseToken: string;
}

@Injectable({ providedIn: 'root' })
export class GooglePlayBilling {
  private readonly window = inject(DOCUMENT).defaultView as
    | (Window & DigitalGoodsWindow)
    | null;

  async fetchPackPrices(): Promise<ReadonlyMap<EnergyPackId, string> | null> {
    const service = await this.connectDigitalGoods();
    if (!service) {
      return null;
    }
    const details = await service.getDetails(
      Object.values(GOOGLE_PLAY_PRODUCT_IDS),
    );
    return new Map(
      details.flatMap((item) => {
        const packId = ENERGY_PACK_ID_BY_GOOGLE_PLAY_PRODUCT_ID.get(
          item.itemId,
        );
        return packId ? [[packId, this.formatPrice(item.price)] as const] : [];
      }),
    );
  }

  async listOwnedPacks(): Promise<GooglePlayOwnedPack[]> {
    const service = await this.connectDigitalGoods();
    if (!service) {
      return [];
    }
    const purchases = await service.listPurchases();
    return purchases.flatMap((purchase) => {
      const packId = ENERGY_PACK_ID_BY_GOOGLE_PLAY_PRODUCT_ID.get(
        purchase.itemId,
      );
      return packId ? [{ packId, purchaseToken: purchase.purchaseToken }] : [];
    });
  }

  isRunningInGoogleChrome(): boolean {
    const navigator: (Navigator & UserAgentDataNavigator) | undefined =
      this.window?.navigator;
    return (
      navigator?.userAgentData?.brands.some(
        (entry) => entry.brand === GOOGLE_CHROME_BRAND,
      ) ?? false
    );
  }

  async payForPack(packId: EnergyPackId): Promise<GooglePlayPackPayment> {
    const request = new PaymentRequest(
      [
        {
          supportedMethods: GOOGLE_PLAY_BILLING_METHOD,
          data: { sku: GOOGLE_PLAY_PRODUCT_IDS[packId] },
        },
      ],
      {
        total: {
          label: PAYMENT_TOTAL_LABEL,
          amount: PAYMENT_PLACEHOLDER_AMOUNT,
        },
      },
    );
    const response = await request.show();
    const details = response.details as GooglePlayPaymentDetails;
    return {
      packId,
      purchaseToken: details.purchaseToken,
      complete: (succeeded) =>
        response.complete(succeeded ? 'success' : 'fail'),
    };
  }

  private async connectDigitalGoods(): Promise<DigitalGoodsService | null> {
    const connect = this.window?.getDigitalGoodsService;
    if (!connect) {
      return null;
    }
    try {
      return await connect.call(this.window, GOOGLE_PLAY_BILLING_METHOD);
    } catch {
      return null;
    }
  }

  private formatPrice(price: DigitalGoodsPrice): string {
    return new Intl.NumberFormat(PRICE_LOCALE, {
      style: 'currency',
      currency: price.currency,
    }).format(Number(price.value));
  }
}
