import { PaymentMethodSummaryDto, PaymentWalletType } from '@psychotech/shared';
import { buildPaymentMethodView } from './payment-method-view';

function card(
  overrides: Partial<PaymentMethodSummaryDto> = {},
): PaymentMethodSummaryDto {
  return {
    brand: 'mastercard',
    last4: '1234',
    expMonth: 8,
    expYear: 2028,
    wallet: null,
    ...overrides,
  };
}

describe('buildPaymentMethodView', () => {
  it('puts the wallet first then the network and last digits for google pay', () => {
    const view = buildPaymentMethodView(
      card({ wallet: PaymentWalletType.GOOGLE_PAY }),
    );
    expect(view.badgeLabel).toBe('Google Pay');
    expect(view.detailLabel).toBe('Mastercard •••• 1234');
    expect(view.expiryLabel).toBe('08/28');
  });

  it('labels apple pay and link wallets', () => {
    expect(
      buildPaymentMethodView(
        card({ wallet: PaymentWalletType.APPLE_PAY, brand: 'visa' }),
      ).badgeLabel,
    ).toBe('Apple Pay');
    expect(
      buildPaymentMethodView(card({ wallet: PaymentWalletType.LINK }))
        .badgeLabel,
    ).toBe('Link');
  });

  it('falls back to the bare card without any wallet', () => {
    const view = buildPaymentMethodView(card());
    expect(view.badgeLabel).toBe('Mastercard');
    expect(view.detailLabel).toBe('•••• 1234');
  });

  it('keeps long brand labels readable', () => {
    expect(
      buildPaymentMethodView(card({ brand: 'cartes_bancaires' })).badgeLabel,
    ).toBe('Cartes Bancaires');
    expect(
      buildPaymentMethodView(card({ brand: 'american_express_corporate' }))
        .badgeLabel,
    ).toBe('American Express Corporate');
    expect(
      buildPaymentMethodView(
        card({
          brand: 'american_express_corporate',
          wallet: PaymentWalletType.GOOGLE_PAY,
        }),
      ).detailLabel,
    ).toBe('American Express Corporate •••• 1234');
  });
});
