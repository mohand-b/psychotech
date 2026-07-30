import { TestBed } from '@angular/core/testing';
import {
  BillingOverviewDto,
  SubscriptionStatus,
  SubscriptionTier,
} from '@psychotech/shared';
import { of } from 'rxjs';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { SubscriptionsApi } from './subscriptions.api';
import { SubscriptionsFacade } from './subscriptions.facade';

function buildOverview(
  overrides: Partial<BillingOverviewDto> = {},
): BillingOverviewDto {
  return {
    tier: SubscriptionTier.ESSENTIAL,
    status: SubscriptionStatus.ACTIVE,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    currentPeriodEnd: '2026-08-17T00:00:00.000Z',
    pendingTier: null,
    monthlyAmount: 899,
    paymentMethod: null,
    nextInvoiceDate: '2026-08-17T00:00:00.000Z',
    ...overrides,
  };
}

function setup() {
  TestBed.resetTestingModule();
  const getBillingOverview = vi.fn().mockReturnValue(of(buildOverview()));
  const cancelSubscription = vi
    .fn()
    .mockReturnValue(of({ cancelAtPeriodEnd: true }));
  const resumeSubscription = vi
    .fn()
    .mockReturnValue(of({ cancelAtPeriodEnd: false }));
  const loadCurrentUser = vi
    .fn()
    .mockReturnValue(of({ tier: SubscriptionTier.ESSENTIAL }));
  TestBed.configureTestingModule({
    providers: [
      {
        provide: SubscriptionsApi,
        useValue: {
          getBillingOverview,
          cancelSubscription,
          resumeSubscription,
        },
      },
      { provide: AuthFacade, useValue: { loadCurrentUser } },
    ],
  });
  const facade = TestBed.inject(SubscriptionsFacade);
  return {
    facade,
    getBillingOverview,
    cancelSubscription,
    resumeSubscription,
    loadCurrentUser,
  };
}

describe('SubscriptionsFacade billing overview', () => {
  it('loads the overview into the store without reconciling by default', () => {
    const { facade, getBillingOverview, loadCurrentUser } = setup();

    facade.loadBillingOverview().subscribe();

    expect(getBillingOverview).toHaveBeenCalledWith(false);
    expect(loadCurrentUser).not.toHaveBeenCalled();
    expect(facade.billingOverview()).toMatchObject({
      tier: SubscriptionTier.ESSENTIAL,
    });
  });

  it('reconciles against stripe and refreshes the user on demand', () => {
    const { facade, getBillingOverview, loadCurrentUser } = setup();

    facade.loadBillingOverview(true).subscribe();

    expect(getBillingOverview).toHaveBeenCalledWith(true);
    expect(loadCurrentUser).toHaveBeenCalled();
  });

  it('cancels in-app then refreshes the tier and the overview', () => {
    const { facade, cancelSubscription, loadCurrentUser, getBillingOverview } =
      setup();

    facade.cancelSubscription().subscribe();

    expect(cancelSubscription).toHaveBeenCalled();
    expect(loadCurrentUser).toHaveBeenCalled();
    expect(getBillingOverview).toHaveBeenCalled();
  });

  it('resumes in-app then refreshes the tier and the overview', () => {
    const { facade, resumeSubscription, loadCurrentUser, getBillingOverview } =
      setup();

    facade.resumeSubscription().subscribe();

    expect(resumeSubscription).toHaveBeenCalled();
    expect(loadCurrentUser).toHaveBeenCalled();
    expect(getBillingOverview).toHaveBeenCalled();
  });
});
