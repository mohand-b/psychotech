import {
  PaymentMethodSummaryDto,
  PaymentWalletType,
} from '@psychotech/shared';

const WALLET_LABELS: Record<PaymentWalletType, string> = {
  [PaymentWalletType.GOOGLE_PAY]: 'Google Pay',
  [PaymentWalletType.APPLE_PAY]: 'Apple Pay',
  [PaymentWalletType.LINK]: 'Link',
};

const CARD_BRAND_LABELS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  cartes_bancaires: 'Cartes Bancaires',
};

export interface PaymentMethodView {
  badgeLabel: string;
  detailLabel: string;
  expiryLabel: string;
}

function brandLabelOf(brand: string): string {
  const known = CARD_BRAND_LABELS[brand.toLowerCase()];
  if (known) {
    return known;
  }
  return brand
    .split(/[_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function buildPaymentMethodView(
  card: PaymentMethodSummaryDto,
): PaymentMethodView {
  const brand = brandLabelOf(card.brand);
  const wallet = card.wallet ? WALLET_LABELS[card.wallet] : null;
  return {
    badgeLabel: wallet ?? brand,
    detailLabel: wallet
      ? `${brand} •••• ${card.last4}`
      : `•••• ${card.last4}`,
    expiryLabel: `${String(card.expMonth).padStart(2, '0')}/${String(
      card.expYear,
    ).slice(-2)}`,
  };
}
