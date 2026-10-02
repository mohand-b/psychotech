import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BadgeId, EarnedBadgeDto, Sector } from '@psychotech/shared';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { BadgeStore } from '../../core/badges/badge.store';
import {
  BadgeCelebrationFacade,
  ResultBadgesSource,
} from './badge-celebration.facade';
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
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: BadgesApi,
        useValue: { acknowledge, unacknowledged: unacknowledgedCall },
      },
      {
        provide: AuthFacade,
        useValue: { currentUser: () => ({ currentSector: Sector.RAILWAY }) },
      },
    ],
  });
  return {
    facade: TestBed.inject(BadgeCelebrationFacade),
    store: TestBed.inject(BadgeStore),
    acknowledge,
    unacknowledgedCall,
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

  it('returns only the badges it has just acknowledged', () => {
    const { facade, store } = setup();
    const favorable = badge(BadgeId.EXAM_FAVORABLE, 2);
    store.enqueue([favorable]);

    expect(facade.completeCurrent()).toEqual([favorable]);
    store.replay([favorable]);
    expect(facade.completeCurrent()).toEqual([]);
  });

  it('acknowledges every remaining badge when the run is dismissed', () => {
    const { facade, store, acknowledge } = setup();
    store.enqueue([
      badge(BadgeId.EXAM_FIRST),
      badge(BadgeId.EXAM_FAVORABLE, 2),
    ]);
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

  it('holds the celebration until the result scene is ready', () => {
    const { facade, store } = setup();
    const celebration = TestBed.runInInjectionContext(() =>
      facade.celebrateResult(
        'session-1',
        signal<ResultBadgesSource | null>(null),
      ),
    );
    store.enqueue([badge(BadgeId.EXAM_FIRST)]);
    expect(store.phase()).toBe('awaitingScene');
    celebration.sceneReady();
    expect(store.phase()).toBe('celebrating');
  });
});
