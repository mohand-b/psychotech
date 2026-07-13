import { TestBed } from '@angular/core/testing';
import { EnergyStateDto, SubscriptionTier } from '@psychotech/shared';
import { of } from 'rxjs';
import { EnergyApi } from '../../energy/data-access/energy.api';
import { EnergyFacade } from '../../energy/data-access/energy.facade';
import { CoreFacade } from './core.facade';

function buildEnergy(tier: SubscriptionTier): EnergyStateDto {
  return {
    balance: 5,
    capacity: 5,
    tier,
    resetsAt: '2026-07-14T00:00:00',
    canStartFull: true,
    canStartAxis: true,
  };
}

describe('CoreFacade', () => {
  let facade: CoreFacade;
  let energyFacade: EnergyFacade;

  beforeEach(() => {
    localStorage.removeItem('psychotech.dev.tier');
    TestBed.configureTestingModule({
      providers: [
        {
          provide: EnergyApi,
          useValue: {
            state: () => of(buildEnergy(SubscriptionTier.ESSENTIAL)),
          },
        },
      ],
    });
    facade = TestBed.inject(CoreFacade);
    energyFacade = TestBed.inject(EnergyFacade);
  });

  afterEach(() => {
    localStorage.removeItem('psychotech.dev.tier');
  });

  it('defaults the tier to FREE while no energy state is loaded', () => {
    expect(facade.tier()).toBe(SubscriptionTier.FREE);
  });

  it('derives the tier from the loaded energy state', () => {
    energyFacade.load().subscribe();
    expect(facade.tier()).toBe(SubscriptionTier.ESSENTIAL);
  });

  it('lets the dev override take precedence over the loaded tier', () => {
    energyFacade.load().subscribe();
    facade.setTierOverride(SubscriptionTier.UNLIMITED);
    expect(facade.tier()).toBe(SubscriptionTier.UNLIMITED);
    facade.setTierOverride(null);
    expect(facade.tier()).toBe(SubscriptionTier.ESSENTIAL);
  });
});
