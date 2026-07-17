import { describe, expect, it } from 'vitest';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { SKIP_CSRF_KEY } from '../auth/decorators/skip-csrf.decorator';
import { BillingController } from './billing.controller';

describe('BillingController.handleWebhook guards', () => {
  it('opts the webhook route out of the auth guard', () => {
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        BillingController.prototype.handleWebhook,
      ),
    ).toBe(true);
  });

  it('opts the webhook route out of the csrf guard', () => {
    expect(
      Reflect.getMetadata(
        SKIP_CSRF_KEY,
        BillingController.prototype.handleWebhook,
      ),
    ).toBe(true);
  });

  it('keeps subscription and portal behind the auth guard', () => {
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        BillingController.prototype.createSubscription,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        BillingController.prototype.createPortalSession,
      ),
    ).toBeUndefined();
  });
});
