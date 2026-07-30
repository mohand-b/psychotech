import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  EnergyStateDto,
  SubscriptionTier,
  UserProfileDto,
} from '@psychotech/shared';
import { of } from 'rxjs';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { EnergyApi } from './energy.api';
import { EnergyFacade } from './energy.facade';

function energyState(
  tier: SubscriptionTier,
  canStartAxis: boolean,
): EnergyStateDto {
  return {
    balance: 5,
    capacity: 5,
    tier,
    resetsAt: '2026-07-26T22:00:00.000Z',
    canStartFull: canStartAxis,
    canStartAxis,
  };
}

describe('EnergyFacade — rechargement au changement de formule', () => {
  let currentUser: WritableSignal<UserProfileDto | null>;
  let stateApi: ReturnType<typeof vi.fn>;

  function setup(initialTier: SubscriptionTier | null): EnergyFacade {
    currentUser = signal<UserProfileDto | null>(
      initialTier === null ? null : ({ tier: initialTier } as UserProfileDto),
    );
    stateApi = vi.fn(() =>
      of(
        energyState(
          currentUser()?.tier ?? SubscriptionTier.FREE,
          currentUser()?.tier === SubscriptionTier.ESSENTIAL,
        ),
      ),
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthFacade, useValue: { currentUser } },
        { provide: EnergyApi, useValue: { state: stateApi } },
      ],
    });
    return TestBed.inject(EnergyFacade);
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('recharge l’état quand la formule passe de FREE à ESSENTIAL, sans reload', () => {
    const facade = setup(SubscriptionTier.FREE);
    TestBed.tick();
    expect(stateApi).toHaveBeenCalledTimes(1);
    expect(facade.state()?.canStartAxis).toBe(false);

    currentUser.set({ tier: SubscriptionTier.ESSENTIAL } as UserProfileDto);
    TestBed.tick();

    expect(stateApi).toHaveBeenCalledTimes(2);
    expect(facade.state()?.canStartAxis).toBe(true);
  });

  it('vide l’état quand l’utilisateur se déconnecte', () => {
    const facade = setup(SubscriptionTier.ESSENTIAL);
    TestBed.tick();
    expect(facade.state()).not.toBeNull();

    currentUser.set(null);
    TestBed.tick();

    expect(facade.state()).toBeNull();
    expect(stateApi).toHaveBeenCalledTimes(1);
  });
});
