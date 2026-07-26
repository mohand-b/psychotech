import { DOCUMENT } from '@angular/common';
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

interface FakeWindow {
  listeners: Record<string, () => void>;
  storage: Map<string, string>;
  assign: ReturnType<typeof vi.fn>;
}

function buildFakeWindow(): { view: unknown; handles: FakeWindow } {
  const listeners: Record<string, () => void> = {};
  const storage = new Map<string, string>();
  const assign = vi.fn();
  const view = {
    addEventListener: (type: string, callback: () => void) => {
      listeners[type] = callback;
    },
    sessionStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
    location: { assign },
  };
  return { view, handles: { listeners, storage, assign } };
}

function setup() {
  TestBed.resetTestingModule();
  const { view, handles } = buildFakeWindow();
  const getBillingOverview = vi.fn().mockReturnValue(of(buildOverview()));
  const createPortalSession = vi
    .fn()
    .mockReturnValue(of({ url: 'https://billing.stripe.com/session/xyz' }));
  const loadCurrentUser = vi
    .fn()
    .mockReturnValue(of({ tier: SubscriptionTier.ESSENTIAL }));
  TestBed.configureTestingModule({
    providers: [
      { provide: DOCUMENT, useValue: { defaultView: view } },
      {
        provide: SubscriptionsApi,
        useValue: { getBillingOverview, createPortalSession },
      },
      { provide: AuthFacade, useValue: { loadCurrentUser } },
    ],
  });
  const facade = TestBed.inject(SubscriptionsFacade);
  return {
    facade,
    handles,
    getBillingOverview,
    createPortalSession,
    loadCurrentUser,
  };
}

describe('SubscriptionsFacade billing overview', () => {
  it('loads the overview into the store without reconciling by default', () => {
    const { facade, getBillingOverview } = setup();

    facade.loadBillingOverview().subscribe();

    expect(getBillingOverview).toHaveBeenCalledWith(false);
    expect(facade.billingOverview()).toMatchObject({
      tier: SubscriptionTier.ESSENTIAL,
    });
  });

  it('opens the portal and marks the return as pending', () => {
    const { facade, handles, createPortalSession } = setup();

    facade.openPortal('/profil').subscribe();

    expect(createPortalSession).toHaveBeenCalledWith('/profil');
    expect(handles.assign).toHaveBeenCalledWith(
      'https://billing.stripe.com/session/xyz',
    );
    expect(handles.storage.size).toBe(1);
  });

  it('reconciles and refreshes the user on the load following a portal visit', () => {
    const { facade, getBillingOverview, loadCurrentUser } = setup();

    facade.openPortal('/profil').subscribe();
    facade.loadBillingOverview().subscribe();

    expect(getBillingOverview).toHaveBeenCalledWith(true);
    expect(loadCurrentUser).toHaveBeenCalled();

    getBillingOverview.mockClear();
    facade.loadBillingOverview().subscribe();
    expect(getBillingOverview).toHaveBeenCalledWith(false);
  });

  it('refetches with reconciliation when the window regains focus after the portal', () => {
    const { facade, handles, getBillingOverview } = setup();

    facade.openPortal('/profil').subscribe();
    handles.listeners['focus']();

    expect(getBillingOverview).toHaveBeenCalledWith(true);
    expect(handles.storage.size).toBe(0);
  });

  it('ignores a window focus without a pending portal return', () => {
    const { handles, getBillingOverview } = setup();

    handles.listeners['focus']();

    expect(getBillingOverview).not.toHaveBeenCalled();
  });
});
