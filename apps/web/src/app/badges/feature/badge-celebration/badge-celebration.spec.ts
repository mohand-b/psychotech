import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import {
  BadgeId,
  Sector,
  UnacknowledgedBadgeDto,
} from '@psychotech/shared';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { BadgesFacade } from '../../data-access/badges.facade';
import { BadgeCelebration, isQuietForCelebration } from './badge-celebration';

interface Setup {
  fixture: ComponentFixture<BadgeCelebration>;
  loadUnacknowledged: ReturnType<typeof vi.fn>;
  acknowledgeCurrentCelebration: ReturnType<typeof vi.fn>;
}

async function setup(
  pending: UnacknowledgedBadgeDto[],
  currentUrl = '/',
): Promise<Setup> {
  TestBed.resetTestingModule();
  const loadUnacknowledged = vi.fn();
  const acknowledgeCurrentCelebration = vi.fn();
  await TestBed.configureTestingModule({
    imports: [BadgeCelebration],
    providers: [
      provideRouter([]),
      {
        provide: BadgesFacade,
        useValue: {
          pending: signal(pending).asReadonly(),
          loadUnacknowledged,
          acknowledgeCurrentCelebration,
        },
      },
      {
        provide: AuthFacade,
        useValue: { currentUser: () => ({ currentSector: Sector.RAILWAY }) },
      },
    ],
  }).compileComponents();
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'url', 'get').mockReturnValue(currentUrl);
  const fixture = TestBed.createComponent(BadgeCelebration);
  fixture.detectChanges();
  return { fixture, loadUnacknowledged, acknowledgeCurrentCelebration };
}

const FIRST_STEPS_PENDING: UnacknowledgedBadgeDto = {
  badgeId: BadgeId.FIRST_STEPS,
  earnedAt: '2026-07-08T10:00:00.000Z',
  energyReward: 5,
};

describe('BadgeCelebration', () => {
  it('loads the unacknowledged badges at startup', async () => {
    const { loadUnacknowledged } = await setup([]);
    expect(loadUnacknowledged).toHaveBeenCalledTimes(1);
  });

  it('celebrates the first pending badge with its textual credited gain', async () => {
    const { fixture } = await setup([FIRST_STEPS_PENDING]);
    const card = fixture.nativeElement.querySelector('.celebration__card');
    expect(card).not.toBeNull();
    expect(card.textContent).toContain('Badge débloqué');
    expect(card.textContent).toContain('Premiers pas');
    expect(card.textContent?.replace(/\s+/g, ' ')).toContain('+5 créditées');
    expect(card.querySelector('.celebration__gain ui-bolt')).not.toBeNull();
    expect(
      card.querySelector('.celebration__art').getAttribute('src'),
    ).toBe('badges/badge-premiers-pas.svg');
  });

  it('omits the gain line for a badge without energy reward', async () => {
    const { fixture } = await setup([
      {
        badgeId: BadgeId.LOGIC_PROGRESSION,
        earnedAt: '2026-07-12T10:00:00.000Z',
        energyReward: 0,
      },
    ]);
    const card = fixture.nativeElement.querySelector('.celebration__card');
    expect(card.textContent).toContain('Déclic');
    expect(card.textContent).not.toContain('crédité');
  });

  it('acknowledges the celebrated badge when the user continues', async () => {
    const { fixture, acknowledgeCurrentCelebration } = await setup([
      FIRST_STEPS_PENDING,
    ]);
    fixture.nativeElement.querySelector('ui-button button').click();
    expect(acknowledgeCurrentCelebration).toHaveBeenCalledTimes(1);
  });

  it('shows nothing without pending badges', async () => {
    const { fixture } = await setup([]);
    expect(fixture.nativeElement.querySelector('.celebration')).toBeNull();
  });

  it('stays hidden on a play route even with a pending badge', async () => {
    const { fixture } = await setup(
      [FIRST_STEPS_PENDING],
      '/entrainements/cible/logique/session/session-1',
    );
    expect(fixture.nativeElement.querySelector('.celebration')).toBeNull();
  });
});

describe('isQuietForCelebration', () => {
  it('rejects play, discovery, result and correction routes', () => {
    expect(
      isQuietForCelebration('/entrainements/cible/logique/session/session-1'),
    ).toBe(false);
    expect(isQuietForCelebration('/entrainements/tutoriel/memoire')).toBe(
      false,
    );
    expect(
      isQuietForCelebration(
        '/entrainements/examen-blanc/session/session-1/axe/logique',
      ),
    ).toBe(false);
    expect(isQuietForCelebration('/sessions/session-1/resultat')).toBe(false);
    expect(
      isQuietForCelebration(
        '/entrainements/examen-blanc/session/session-1/correction/logique',
      ),
    ).toBe(false);
  });

  it('accepts the calm connected routes', () => {
    expect(isQuietForCelebration('/dashboard')).toBe(true);
    expect(isQuietForCelebration('/badges')).toBe(true);
    expect(isQuietForCelebration('/energie')).toBe(true);
    expect(isQuietForCelebration('/sessions')).toBe(true);
  });
});
