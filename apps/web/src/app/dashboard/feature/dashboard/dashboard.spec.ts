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
  SimulationVerdict,
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
import { Clock } from '../../../shared/util/clock';
import { Dashboard } from './dashboard';

const USER: UserProfileDto = {
  id: 'user-1',
  email: 'mohand@example.com',
  firstName: 'Mohand',
  lastName: 'Boudjema',
  locale: 'fr-FR',
  timezone: 'Europe/Paris',
  currentSector: Sector.RAILWAY,
  tier: SubscriptionTier.ESSENTIAL,
  subscription: null,
  createdAt: '2026-06-01T00:00:00.000Z',
};

function energyState(tier: SubscriptionTier, balance: number): EnergyStateDto {
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
      verdict: SimulationVerdict.FAVORABLE,
      sectorThreshold: 70,
      completedAt: '2026-07-15T19:42:00.000Z',
    },
    vigilanceThreshold: 65,
    axes: FULL_SESSION_AXIS_ORDER.map((axis) => ({
      axis,
      bestScore:
        axis === AxisType.REACTIVITY ? 70 : axis === AxisType.MEMORY ? 61 : 82,
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
      fullSessionsCount: 2,
      targetedSessionsCount: 2,
      firstSessionAt: '2026-07-01T10:00:00.000Z',
      firstFullSessionAt: '2026-07-01T10:00:00.000Z',
      firstGlobalScore: 60,
      bestGlobalScore: 74.8,
      bestGlobalScoreAt: '2026-07-10T10:00:00.000Z',
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
  overview?: TrainingsOverviewDto | null;
  progression?: ProgressionDto | null;
  current?: CurrentSessionDto | null;
  hour?: number;
}

async function setup(options: SetupOptions = {}) {
  const tier = options.tier ?? SubscriptionTier.ESSENTIAL;
  const overview =
    options.overview === undefined ? overviewWithData() : options.overview;
  const overviewFacade = {
    overview: signal<TrainingsOverviewDto | null>(overview),
    loading: signal(false),
    error: signal<unknown>(undefined),
    load: vi.fn(),
    reload: vi.fn(),
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
      {
        provide: Clock,
        useValue: {
          now: () => {
            const date = new Date('2026-07-25T00:00:00');
            date.setHours(options.hour ?? 10);
            return date;
          },
        },
      },
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

  it('says bonsoir outside the five to eighteen local window', async () => {
    const evening = await setup({ hour: 20 });
    expect(textOf(evening.fixture)).toContain('Bonsoir Mohand');

    TestBed.resetTestingModule();
    const night = await setup({ hour: 4 });
    expect(textOf(night.fixture)).toContain('Bonsoir Mohand');

    TestBed.resetTestingModule();
    const lateAfternoon = await setup({ hour: 17 });
    expect(textOf(lateAfternoon.fixture)).toContain('Bonjour Mohand');
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
    expect(textOf(fixture)).toContain(
      'Énergie illimitée, sans quota journalier',
    );
    expect(textOf(fixture)).not.toContain("Passer à l'Illimité");
    expect(textOf(fixture)).toContain('∞');
  });

  it('keeps the selection subtitle on every paying tier', async () => {
    const unlimited = await setup({ tier: SubscriptionTier.UNLIMITED });
    expect(textOf(unlimited.fixture)).toContain(
      'Chaque session vous rapproche de la sélection.',
    );
    expect(textOf(unlimited.fixture)).not.toContain('à vous de choisir');

    TestBed.resetTestingModule();
    const essentialFull = await setup();
    expect(textOf(essentialFull.fixture)).toContain(
      'Chaque session vous rapproche de la sélection.',
    );
    expect(textOf(essentialFull.fixture)).not.toContain('à vous de choisir');
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
      'Votre profil se dessinera après votre premier examen blanc.',
    );
  });

  it('renders the running session with its progress stepper and resumes it', async () => {
    const { fixture, navigate } = await setup({ current: fullSession() });
    expect(textOf(fixture)).toContain('Reprenez votre examen blanc');
    expect(
      fixture.nativeElement.querySelectorAll('.home__day-stepper .step'),
    ).toHaveLength(5);
    expect(
      fixture.nativeElement.querySelectorAll('.home__day-dot-item'),
    ).toHaveLength(0);
    const cta = fixture.nativeElement.querySelector(
      '.home__cta-primary',
    ) as HTMLButtonElement;
    cta.click();
    expect(navigate).toHaveBeenCalledWith([
      '/entrainements/examen-blanc/session',
      'session-live',
    ]);
  });

  it('renders the last result with its threshold bar and opens the report', async () => {
    const { fixture, navigate } = await setup();
    expect(textOf(fixture)).toContain('74,8');
    expect(textOf(fixture)).toContain('Favorable');
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
    expect(textOf(fixture)).toContain('dure au plus 3 minutes');
    const cta = fixture.nativeElement.querySelector(
      '.home__cta-outline',
    ) as HTMLButtonElement;
    expect(cta.textContent).toContain('Travailler cet axe');
    cta.click();
    expect(navigate).toHaveBeenCalledWith(['/entrainements/cible', 'memoire']);
  });

  it('renders skeletons over the async widgets while the overview loads', async () => {
    const { fixture } = await setup({ overview: null, progression: null });
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.home__skeleton-score')).not.toBeNull();
    expect(element.querySelector('.home__skeleton-radar')).not.toBeNull();
    expect(element.querySelector('.home__skeleton-weak-icon')).not.toBeNull();
    expect(textOf(fixture)).not.toContain("Aucun résultat pour l'instant");
    expect(textOf(fixture)).not.toContain('À découvrir');
  });

  it('drops every skeleton once the overview data arrives', async () => {
    const { fixture } = await setup();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('ui-skeleton'),
    ).toBeNull();
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
