import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import {
  AxisProgressStatus,
  AxisType,
  CurrentSessionDto,
  EnergyStateDto,
  FULL_SESSION_AXIS_ORDER,
  ProgressionDto,
  ScoreBand,
  Sector,
  SessionMode,
  SubscriptionTier,
  TrainingsOverviewDto,
  UserProfileDto,
} from '@psychotech/shared';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { TrainingsOverviewFacade } from '../../../entrainements/data-access/trainings-overview.facade';
import { ProgressionFacade } from '../../../progression/data-access/progression.facade';
import { SessionHistoryFacade } from '../../../sessions/data-access/session-history.facade';
import { Dashboard } from './dashboard';

const USER: UserProfileDto = {
  id: 'user-1',
  email: 'mohand@example.com',
  firstName: 'Mohand',
  lastName: 'Boudjema',
  locale: 'fr-FR',
  timezone: 'Europe/Paris',
  currentSector: Sector.RAILWAY,
  createdAt: '2026-06-01T00:00:00.000Z',
};

function energyState(
  tier: SubscriptionTier,
  balance: number,
): EnergyStateDto {
  return {
    balance,
    capacity: 5,
    tier,
    resetsAt: '2026-07-17T00:00:00.000Z',
    canStartFull: balance >= 5,
    canStartAxis: balance >= 1,
  };
}

function overviewWithData(): TrainingsOverviewDto {
  return {
    lastSimulation: {
      sessionId: 'session-9',
      globalScore: 74.8,
      globalBand: ScoreBand.ACCEPTABLE,
      isAdmissible: true,
      isEliminated: false,
      sectorThreshold: 70,
      completedAt: '2026-07-15T19:42:00.000Z',
    },
    vigilanceThreshold: 65,
    axes: FULL_SESSION_AXIS_ORDER.map((axis) => ({
      axis,
      bestScore:
        axis === AxisType.REACTIVITY
          ? 70
          : axis === AxisType.MEMORY
            ? 61
            : 82,
      neverPlayed: false,
      isCriticalAxis: axis === AxisType.REACTIVITY,
      needsWork: axis === AxisType.MEMORY,
    })),
  };
}

function emptyOverview(): TrainingsOverviewDto {
  return {
    lastSimulation: null,
    vigilanceThreshold: 65,
    axes: FULL_SESSION_AXIS_ORDER.map((axis) => ({
      axis,
      bestScore: null,
      neverPlayed: true,
      isCriticalAxis: axis === AxisType.REACTIVITY,
      needsWork: false,
    })),
  };
}

function progressionWithData(): ProgressionDto {
  return {
    stats: {
      currentStreak: 3,
      longestStreak: 5,
      completedSessions: 4,
      firstSessionAt: '2026-07-01T10:00:00.000Z',
      bestGlobalScore: 74.8,
    },
    evolution: [],
    axes: [],
    radar: {
      first: [],
      last: FULL_SESSION_AXIS_ORDER.map((axis) => ({ axis, score: 60 })),
    },
  };
}

function fullSession(): CurrentSessionDto {
  return {
    id: 'session-live',
    mode: SessionMode.FULL,
    sector: Sector.RAILWAY,
    axes: FULL_SESSION_AXIS_ORDER.map((axis, index) => ({
      axis,
      status:
        index < 3
          ? AxisProgressStatus.DONE
          : index === 3
            ? AxisProgressStatus.CURRENT
            : AxisProgressStatus.PENDING,
    })),
  };
}

interface SetupOptions {
  tier?: SubscriptionTier;
  balance?: number;
  overview?: TrainingsOverviewDto;
  progression?: ProgressionDto | null;
  current?: CurrentSessionDto | null;
}

async function setup(options: SetupOptions = {}) {
  const tier = options.tier ?? SubscriptionTier.ESSENTIAL;
  const overview = options.overview ?? overviewWithData();
  const overviewFacade = {
    overview: signal<TrainingsOverviewDto | null>(overview),
    loading: signal(false),
    load: vi.fn(),
  };
  const progressionFacade = {
    progression: signal<ProgressionDto | null>(
      options.progression === undefined
        ? progressionWithData()
        : options.progression,
    ),
    loading: signal(false),
  };
  const sessionHistoryFacade = {
    current: signal<CurrentSessionDto | null>(options.current ?? null),
    refreshCurrent: vi.fn(),
  };

  await TestBed.configureTestingModule({
    imports: [Dashboard],
    providers: [
      provideRouter([]),
      { provide: AuthFacade, useValue: { currentUser: signal(USER) } },
      { provide: CoreFacade, useValue: { tier: signal(tier) } },
      {
        provide: EnergyFacade,
        useValue: {
          state: signal(energyState(tier, options.balance ?? 5)),
        },
      },
      { provide: SessionHistoryFacade, useValue: sessionHistoryFacade },
    ],
  })
    .overrideComponent(Dashboard, {
      set: {
        providers: [
          { provide: TrainingsOverviewFacade, useValue: overviewFacade },
          { provide: ProgressionFacade, useValue: progressionFacade },
        ],
      },
    })
    .compileComponents();

  const fixture = TestBed.createComponent(Dashboard);
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  fixture.detectChanges();
  return { fixture, navigate, overviewFacade, sessionHistoryFacade };
}

function textOf(fixture: { nativeElement: HTMLElement }): string {
  return fixture.nativeElement.textContent ?? '';
}

describe('Dashboard', () => {
  it('greets the user and invites to train when no session is running', async () => {
    const { fixture } = await setup();
    expect(textOf(fixture)).toContain('Bonjour Mohand');
    expect(textOf(fixture)).toContain("C'est le moment de vous entraîner");
    expect(textOf(fixture)).toContain('Énergie pleine');
    expect(textOf(fixture)).toContain('5/5');
  });

  it('navigates to the trainings page from the train call to action', async () => {
    const { fixture, navigate } = await setup();
    const cta = fixture.nativeElement.querySelector(
      '.home__cta-primary',
    ) as HTMLButtonElement;
    cta.click();
    expect(navigate).toHaveBeenCalledWith(['/entrainements']);
  });

  it('shows the essential plan with an upgrade link', async () => {
    const { fixture } = await setup();
    expect(textOf(fixture)).toContain('Essentiel');
    expect(textOf(fixture)).toContain('5 énergies par jour');
    expect(textOf(fixture)).toContain("Passer à l'Illimité");
    expect(textOf(fixture)).toContain('Gérer ma formule');
  });

  it('shows the unlimited plan without an upgrade link and with infinite energy', async () => {
    const { fixture } = await setup({ tier: SubscriptionTier.UNLIMITED });
    expect(textOf(fixture)).toContain('Illimité');
    expect(textOf(fixture)).toContain('Énergie illimitée, sans quota journalier');
    expect(textOf(fixture)).not.toContain("Passer à l'Illimité");
    expect(textOf(fixture)).toContain('∞');
  });

  it('renders the new-account variant with the free plan and empty states', async () => {
    const { fixture } = await setup({
      tier: SubscriptionTier.FREE,
      overview: emptyOverview(),
      progression: null,
    });
    expect(textOf(fixture)).toContain('Bienvenue Mohand');
    expect(textOf(fixture)).toContain('Découvrez votre niveau, axe par axe');
    expect(textOf(fixture)).toContain('Lancer ma première session');
    expect(textOf(fixture)).toContain('Découverte');
    expect(textOf(fixture)).toContain('Gratuit');
    expect(textOf(fixture)).toContain('Découvrir les offres');
    expect(textOf(fixture)).toContain("Aucun résultat pour l'instant");
    expect(textOf(fixture)).toContain('À découvrir');
    expect(textOf(fixture)).toContain(
      'Votre profil se dessinera après votre première simulation.',
    );
  });

  it('renders the running session with its chips and resumes it', async () => {
    const { fixture, navigate } = await setup({ current: fullSession() });
    expect(textOf(fixture)).toContain('Reprenez votre simulation');
    expect(textOf(fixture)).toContain('3/5');
    expect(textOf(fixture)).toContain('prochain :');
    expect(textOf(fixture)).toContain('Réactivité');
    expect(fixture.nativeElement.querySelectorAll('.home__chip')).toHaveLength(
      5,
    );
    const cta = fixture.nativeElement.querySelector(
      '.home__cta-primary',
    ) as HTMLButtonElement;
    cta.click();
    expect(navigate).toHaveBeenCalledWith([
      '/entrainements/simulation/session',
      'session-live',
    ]);
  });

  it('renders the last result with its threshold bar and opens the report', async () => {
    const { fixture, navigate } = await setup();
    expect(textOf(fixture)).toContain('74,8');
    expect(textOf(fixture)).toContain('Acceptable');
    expect(textOf(fixture)).toContain('+4,8 au-dessus');
    expect(
      fixture.nativeElement.querySelector('.home__result-bar ui-threshold-bar'),
    ).not.toBeNull();
    const detail = [
      ...fixture.nativeElement.querySelectorAll('.home__link'),
    ].find((link) => link.textContent?.includes('Voir le détail'));
    (detail as HTMLButtonElement).click();
    expect(navigate).toHaveBeenCalledWith([
      '/sessions',
      'session-9',
      'resultat',
    ]);
  });

  it('picks the weakest played axis and routes to its targeted training', async () => {
    const { fixture, navigate } = await setup();
    expect(textOf(fixture)).toContain('Votre point faible');
    expect(textOf(fixture)).toContain('Mémoire');
    const cta = fixture.nativeElement.querySelector(
      '.home__cta-outline',
    ) as HTMLButtonElement;
    expect(cta.textContent).toContain('Travailler la Mémoire');
    cta.click();
    expect(navigate).toHaveBeenCalledWith(['/entrainements/cible', 'memoire']);
  });

  it('switches the radar caption between last session and best scores', async () => {
    const { fixture } = await setup();
    expect(textOf(fixture)).toContain('Dernière session ·');
    const segs = fixture.nativeElement.querySelectorAll('.home__radar-seg');
    (segs[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(textOf(fixture)).toContain(
      'Meilleurs scores, tous entraînements confondus',
    );
  });
});
