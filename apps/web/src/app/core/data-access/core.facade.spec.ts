import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  Sector,
  SubscriptionTier,
  UserProfileDto,
} from '@psychotech/shared';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { CoreFacade } from './core.facade';

function buildUser(tier: SubscriptionTier): UserProfileDto {
  return {
    id: 'user-1',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Martin',
    locale: 'fr',
    timezone: 'Europe/Paris',
    currentSector: Sector.RAILWAY,
    tier,
    subscription: null,
    createdAt: '2026-06-13T10:00:00.000Z',
  };
}

describe('CoreFacade', () => {
  let facade: CoreFacade;
  const currentUser = signal<UserProfileDto | null>(null);

  beforeEach(() => {
    localStorage.removeItem('psychotech.dev.tier');
    currentUser.set(null);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthFacade, useValue: { currentUser } }],
    });
    facade = TestBed.inject(CoreFacade);
  });

  afterEach(() => {
    localStorage.removeItem('psychotech.dev.tier');
  });

  it('defaults the tier to FREE while no profile is loaded', () => {
    expect(facade.tier()).toBe(SubscriptionTier.FREE);
  });

  it('derives the tier from the current user profile', () => {
    currentUser.set(buildUser(SubscriptionTier.ESSENTIAL));
    expect(facade.tier()).toBe(SubscriptionTier.ESSENTIAL);
  });

  it('lets the dev override take precedence over the profile tier', () => {
    currentUser.set(buildUser(SubscriptionTier.ESSENTIAL));
    facade.setTierOverride(SubscriptionTier.UNLIMITED);
    expect(facade.tier()).toBe(SubscriptionTier.UNLIMITED);
    facade.setTierOverride(null);
    expect(facade.tier()).toBe(SubscriptionTier.ESSENTIAL);
  });
});
