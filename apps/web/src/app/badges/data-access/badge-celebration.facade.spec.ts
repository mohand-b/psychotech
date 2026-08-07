import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BadgeId, EarnedBadgeDto } from '@psychotech/shared';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { BadgeStore } from '../../core/badges/badge.store';
import { EnergyFacade } from '../../energy/data-access/energy.facade';
import { BadgeCelebrationFacade } from './badge-celebration.facade';
import { BadgesApi } from './badges.api';

function badge(badgeId: BadgeId, gain: number | null = null): EarnedBadgeDto {
  return {
    badgeId,
    earnedAt: '2026-08-07T10:00:00.000Z',
    gain,
    conditions: [
      { id: 'c1', label: 'Condition', met: true, justValidated: true },
    ],
  };
}

function setup(unacknowledged: EarnedBadgeDto[] = []) {
  const acknowledge = vi.fn().mockReturnValue(of(undefined));
  const unacknowledgedCall = vi.fn().mockReturnValue(of(unacknowledged));
  const energyLoad = vi.fn().mockReturnValue(of(null));
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: BadgesApi,
        useValue: { acknowledge, unacknowledged: unacknowledgedCall },
      },
      { provide: EnergyFacade, useValue: { load: energyLoad } },
    ],
  });
  return {
    facade: TestBed.inject(BadgeCelebrationFacade),
    store: TestBed.inject(BadgeStore),
    acknowledge,
    unacknowledgedCall,
    energyLoad,
  };
}

describe('BadgeCelebrationFacade', () => {
  it('acknowledges a completed celebration exactly once', () => {
    const { facade, store, acknowledge } = setup();
    store.enqueue([badge(BadgeId.EXAM_FIRST)]);
    facade.completeCurrent();
    facade.completeCurrent();

    expect(acknowledge).toHaveBeenCalledTimes(1);
    expect(acknowledge).toHaveBeenCalledWith(BadgeId.EXAM_FIRST);
  });

  it('refreshes the credit balance only when the badge grants credits', () => {
    const { facade, store, energyLoad } = setup();
    store.enqueue([badge(BadgeId.EXAM_FIRST), badge(BadgeId.EXAM_FAVORABLE, 2)]);
    facade.completeCurrent();
    expect(energyLoad).not.toHaveBeenCalled();
    facade.completeCurrent();
    expect(energyLoad).toHaveBeenCalledTimes(1);
  });

  it('acknowledges every remaining badge when the run is dismissed', () => {
    const { facade, store, acknowledge } = setup();
    store.enqueue([badge(BadgeId.EXAM_FIRST), badge(BadgeId.EXAM_FAVORABLE, 2)]);
    facade.dismissAll();

    expect(acknowledge).toHaveBeenCalledTimes(2);
  });

  it('enqueues reconciled unacknowledged badges once', () => {
    const { facade, store } = setup([badge(BadgeId.FIRST_STEPS, 5)]);
    facade.reconcileUnacknowledged();
    expect(store.current()?.badgeId).toBe(BadgeId.FIRST_STEPS);

    facade.completeCurrent();
    facade.reconcileUnacknowledged();
    expect(store.phase()).toBe('done');
  });

  it('holds the scene through the dedicated gate', () => {
    const { facade, store } = setup();
    facade.holdScene('score-scene');
    store.enqueue([badge(BadgeId.EXAM_FIRST)]);
    expect(store.phase()).toBe('awaitingScene');
    facade.releaseScene('score-scene');
    expect(store.phase()).toBe('celebrating');
  });
});
