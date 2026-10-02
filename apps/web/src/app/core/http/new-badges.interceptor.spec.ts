import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BadgeId } from '@psychotech/shared';
import { EnergyFacade } from '../../energy/data-access/energy.facade';
import { BadgeStore } from '../badges/badge.store';
import { newBadgesInterceptor } from './new-badges.interceptor';

function setup() {
  TestBed.resetTestingModule();
  const energyReload = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([newBadgesInterceptor])),
      provideHttpClientTesting(),
      { provide: EnergyFacade, useValue: { reload: energyReload } },
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    controller: TestBed.inject(HttpTestingController),
    store: TestBed.inject(BadgeStore),
    energyReload,
  };
}

const EARNED = {
  badgeId: BadgeId.LOGIC_PROGRESSION,
  earnedAt: '2026-08-07T10:00:00.000Z',
  gain: null,
  conditions: [
    { id: 'score-70', label: 'Atteindre 70', met: true, justValidated: true },
  ],
};

describe('newBadgesInterceptor', () => {
  it('routes a typed newBadges field into the celebration queue', () => {
    const { http, controller, store } = setup();
    http.post('/api/sessions/1/complete', {}).subscribe();
    controller
      .expectOne('/api/sessions/1/complete')
      .flush({ sessionId: '1', newBadges: [EARNED] });

    expect(store.phase()).toBe('celebrating');
    expect(store.current()?.badgeId).toBe(BadgeId.LOGIC_PROGRESSION);
    controller.verify();
  });

  it('ignores responses without the field and leaves the body intact', () => {
    const { http, controller, store } = setup();
    let received: unknown;
    http.get('/api/me/badges').subscribe((body) => (received = body));
    controller.expectOne('/api/me/badges').flush([{ badgeId: 'X' }]);

    expect(received).toEqual([{ badgeId: 'X' }]);
    expect(store.phase()).toBe('idle');
    controller.verify();
  });

  it('ignores a malformed newBadges payload', () => {
    const { http, controller, store } = setup();
    http.post('/api/sessions/1/complete', {}).subscribe();
    controller
      .expectOne('/api/sessions/1/complete')
      .flush({ newBadges: [{ badgeId: 42 }] });

    expect(store.phase()).toBe('idle');
    controller.verify();
  });

  it('refreshes the credit balance as soon as a badge carries a gain', () => {
    const { http, controller, energyReload } = setup();
    http.post('/api/sessions/1/complete', {}).subscribe();
    controller
      .expectOne('/api/sessions/1/complete')
      .flush({ sessionId: '1', newBadges: [{ ...EARNED, gain: 2 }] });

    expect(energyReload).toHaveBeenCalledTimes(1);
    controller.verify();
  });

  it('leaves the balance untouched when the badges carry no gain', () => {
    const { http, controller, energyReload } = setup();
    http.post('/api/sessions/1/complete', {}).subscribe();
    controller
      .expectOne('/api/sessions/1/complete')
      .flush({ sessionId: '1', newBadges: [EARNED] });

    expect(energyReload).not.toHaveBeenCalled();
    controller.verify();
  });

  it('never delays nor mutates the intercepted response', () => {
    const { http, controller } = setup();
    let received: unknown;
    http.post('/api/sessions/1/complete', {}).subscribe((body) => {
      received = body;
    });
    controller
      .expectOne('/api/sessions/1/complete')
      .flush({ sessionId: '1', newBadges: [EARNED] });

    expect(received).toEqual({ sessionId: '1', newBadges: [EARNED] });
  });
});
