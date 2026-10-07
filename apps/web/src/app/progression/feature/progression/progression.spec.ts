import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import {
  AxisType,
  BADGE_CATALOG,
  BadgeId,
  BadgeStatusDto,
  FULL_SESSION_AXIS_ORDER,
  ProgressionDto,
  ScoreBand,
  Sector,
  SectorReferentialDto,
  SessionMode,
  TrainingsOverviewDto,
  UserProfileDto,
} from '@psychotech/shared';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { BadgesFacade } from '../../../badges/data-access/badges.facade';
import { CatalogFacade } from '../../../catalog/data-access/catalog.facade';
import { TrainingsOverviewFacade } from '../../../entrainements/data-access/trainings-overview.facade';
import { ProgressionFacade } from '../../data-access/progression.facade';
import { Progression } from './progression';

const USER: UserProfileDto = {
  id: 'user-1',
  email: 'mohand@example.com',
  firstName: 'Mohand',
  lastName: 'Boudjema',
  locale: 'fr-FR',
  timezone: 'Europe/Paris',
  currentSector: Sector.RAILWAY,
  showInFeed: false,
  pendingEmail: null,
  passwordChangedAt: null,
  lastLoginAt: null,
  emailVerifiedAt: '2026-01-01T00:00:00.000Z',
  examGuideReadAt: null,
  logicGuideReadAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const REFERENTIAL: SectorReferentialDto = {
  code: Sector.RAILWAY,
  label: 'Ferroviaire',
  isActive: true,
  admissibilityThreshold: 70,
  vigilanceThreshold: 65,
  eliminatoryThreshold: 55,
  axes: FULL_SESSION_AXIS_ORDER.map((axis) => ({
    code: axis,
    label: axis,
    description: '',
    coefficient: axis === AxisType.REACTIVITY ? 1.4 : 1,
    isCritical: axis === AxisType.REACTIVITY,
  })),
};

const DAY_MS = 86_400_000;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

const AXIS_HISTORY: Partial<Record<AxisType, number[]>> = {
  [AxisType.LOGIC]: [70, 70, 70, 76, 78, 82],
  [AxisType.MEMORY]: [70, 70, 70, 64, 62, 61],
  [AxisType.VISUAL_DISCRIMINATION]: [78, 78, 78, 78, 79, 78],
  [AxisType.REACTIVITY]: [68, 70],
};

const AXIS_BEST: Partial<Record<AxisType, number>> = {
  [AxisType.LOGIC]: 82,
  [AxisType.MEMORY]: 61,
  [AxisType.VISUAL_DISCRIMINATION]: 79,
  [AxisType.REACTIVITY]: 70,
};

const AXIS_FIRST_SCORE: Partial<Record<AxisType, number>> = {
  [AxisType.LOGIC]: 64,
  [AxisType.MEMORY]: 70,
  [AxisType.VISUAL_DISCRIMINATION]: 78,
  [AxisType.REACTIVITY]: 68,
};

function earnedStatus(badgeId: BadgeId, daysBefore: number): BadgeStatusDto {
  return {
    badgeId,
    earnedAt: daysAgo(daysBefore),
    acknowledgedAt: daysAgo(daysBefore),
    conditions: [],
    rarityPercent: null,
  };
}

function historyOf(axis: AxisType): number[] {
  return AXIS_HISTORY[axis] ?? [];
}

function bestOf(axis: AxisType): number | null {
  return AXIS_BEST[axis] ?? null;
}

function populatedOverview(): TrainingsOverviewDto {
  return {
    lastSimulation: null,
    vigilanceThreshold: 65,
    axes: FULL_SESSION_AXIS_ORDER.map((axis) => ({
      axis,
      bestScore: bestOf(axis),
      neverPlayed: bestOf(axis) === null,
      isCriticalAxis: axis === AxisType.REACTIVITY,
      needsWork: (bestOf(axis) ?? 100) < 65,
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

function populatedProgression(): ProgressionDto {
  const scores: Record<AxisType, number> = {
    [AxisType.LOGIC]: 82,
    [AxisType.MEMORY]: 61,
    [AxisType.VISUAL_DISCRIMINATION]: 78,
    [AxisType.REACTIVITY]: 70,
    [AxisType.MOTOR_SKILLS]: 88,
  } as Record<AxisType, number>;
  return {
    stats: {
      currentStreak: 3,
      longestStreak: 5,
      completedSessions: 23,
      fullSessionsCount: 8,
      targetedSessionsCount: 15,
      firstSessionAt: '2026-04-14T09:00:00.000Z',
      firstFullSessionAt: '2026-04-14T10:00:00.000Z',
      firstGlobalScore: 64.2,
      bestGlobalScore: 78.2,
      bestGlobalScoreAt: '2026-06-02T18:00:00.000Z',
    },
    evolution: [
      {
        sessionId: 'sim-1',
        date: '2026-04-14T10:00:00.000Z',
        globalScore: 64.2,
        band: ScoreBand.FRAGILE,
        isEliminated: false,
      },
      {
        sessionId: 'sim-2',
        date: '2026-06-02T18:00:00.000Z',
        globalScore: 78.2,
        band: ScoreBand.ACCEPTABLE,
        isEliminated: false,
      },
      {
        sessionId: 'sim-3',
        date: '2026-07-15T19:42:00.000Z',
        globalScore: 74.8,
        band: ScoreBand.ACCEPTABLE,
        isEliminated: false,
      },
    ],
    axes: FULL_SESSION_AXIS_ORDER.map((axis) => ({
      axis,
      firstScore: AXIS_FIRST_SCORE[axis] ?? null,
      currentScore: scores[axis],
      band: ScoreBand.ACCEPTABLE,
      deltaOver30Days: axis === AxisType.LOGIC ? 6 : 2,
      sparkline: historyOf(axis).map((score, index) => ({
        date: daysAgo(historyOf(axis).length - index),
        score,
      })),
      featuredMetric: null,
      lastSessionId: axis === AxisType.LOGIC ? 'targeted-9' : 'sim-3',
      lastSessionMode:
        axis === AxisType.LOGIC ? SessionMode.TARGETED : SessionMode.FULL,
    })),
    radar: {
      first: FULL_SESSION_AXIS_ORDER.map((axis) => ({
        axis,
        score: scores[axis] - 10,
      })),
      last: FULL_SESSION_AXIS_ORDER.map((axis) => ({
        axis,
        score: scores[axis],
      })),
    },
  };
}

function emptyProgression(): ProgressionDto {
  return {
    stats: {
      currentStreak: 0,
      longestStreak: 0,
      completedSessions: 0,
      fullSessionsCount: 0,
      targetedSessionsCount: 0,
      firstSessionAt: null,
      firstFullSessionAt: null,
      firstGlobalScore: null,
      bestGlobalScore: null,
      bestGlobalScoreAt: null,
    },
    evolution: [],
    axes: FULL_SESSION_AXIS_ORDER.map((axis) => ({
      axis,
      firstScore: null,
      currentScore: null,
      band: null,
      deltaOver30Days: null,
      sparkline: [],
      featuredMetric: null,
      lastSessionId: null,
      lastSessionMode: null,
    })),
    radar: {
      first: FULL_SESSION_AXIS_ORDER.map((axis) => ({ axis, score: null })),
      last: FULL_SESSION_AXIS_ORDER.map((axis) => ({ axis, score: null })),
    },
  };
}

async function setup(
  progression: ProgressionDto,
  overview: TrainingsOverviewDto = populatedOverview(),
  badgeStatuses: BadgeStatusDto[] | null = [],
) {
  await TestBed.configureTestingModule({
    imports: [Progression],
    providers: [
      provideRouter([]),
      { provide: AuthFacade, useValue: { currentUser: signal(USER) } },
      {
        provide: BadgesFacade,
        useValue: { fetchStatuses: () => signal(badgeStatuses).asReadonly() },
      },
      {
        provide: CatalogFacade,
        useValue: {
          sectorReferential: signal(REFERENTIAL),
          loadSectorReferential: vi.fn(),
        },
      },
    ],
  })
    .overrideComponent(Progression, {
      set: {
        providers: [
          {
            provide: ProgressionFacade,
            useValue: {
              progression: signal<ProgressionDto | null>(progression),
              loading: signal(false),
            },
          },
          {
            provide: TrainingsOverviewFacade,
            useValue: {
              overview: signal<TrainingsOverviewDto | null>(overview),
              loading: signal(false),
              loadOverview: vi.fn(),
            },
          },
        ],
      },
    })
    .compileComponents();

  const fixture = TestBed.createComponent(Progression);
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  fixture.detectChanges();
  return { fixture, navigate };
}

function textOf(fixture: { nativeElement: HTMLElement }): string {
  return fixture.nativeElement.textContent ?? '';
}

function axisRow(
  fixture: { nativeElement: HTMLElement },
  index: number,
): HTMLElement {
  return fixture.nativeElement.querySelectorAll('.prog__axis-row')[
    index
  ] as HTMLElement;
}

function chartDots(fixture: {
  nativeElement: HTMLElement;
}): NodeListOf<HTMLButtonElement> {
  return fixture.nativeElement.querySelectorAll('.chart__dot');
}

describe('Progression', () => {
  it('renders the aggregates with french formats and numeric dates', async () => {
    const { fixture } = await setup(populatedProgression());
    const text = textOf(fixture);
    expect(text).toContain(
      'Votre préparation Ferroviaire depuis le 14/04/2026.',
    );
    expect(text).toContain('74,8');
    expect(text).toContain('Dernier examen blanc, le 15/07');
    expect(text).toContain('78,2');
    expect(text).toContain('Examen blanc du');
    expect(text).toContain('02/06');
    expect(text).toContain('+10,6');
    expect(text).toContain('De 64,2 à 74,8');
    expect(text).toContain('23');
    expect(text).toContain('15 ciblés');
  });

  it('draws the evolution curve with one clickable point per simulation', async () => {
    const { fixture } = await setup(populatedProgression());
    const chart = fixture.nativeElement.querySelector('ui-evolution-chart');
    expect(chartDots(fixture)).toHaveLength(3);
    expect(chart.querySelector('.chart__line')).not.toBeNull();
    expect(textOf(fixture)).toContain("seuil d'admissibilité Ferroviaire 70.");
  });

  it('paints an eliminated simulation red even above the admissibility threshold', async () => {
    const progression = populatedProgression();
    const admitted = progression.evolution[1];
    const eliminated = progression.evolution[2];
    eliminated.isEliminated = true;
    expect(admitted.globalScore).toBeGreaterThan(70);
    expect(eliminated.globalScore).toBeGreaterThan(70);

    const { fixture } = await setup(progression);
    const dots = chartDots(fixture);

    expect(dots[1].style.getPropertyValue('--dot-color')).toBe(
      'var(--rating-good)',
    );
    expect(dots[2].style.getPropertyValue('--dot-color')).toBe(
      'var(--rating-bad)',
    );
  });

  it('opens the report of a simulation from a curve point', async () => {
    const { fixture, navigate } = await setup(populatedProgression());
    chartDots(fixture)[0].click();
    expect(navigate).toHaveBeenCalledWith(['/sessions', 'sim-1', 'resultat']);
  });

  it('leads each axis with its best score, never with the last session', async () => {
    const { fixture } = await setup(populatedProgression());

    expect(
      axisRow(fixture, 0).querySelector('.prog__axis-best-value')?.textContent,
    ).toContain('79');
    expect(
      axisRow(fixture, 4).querySelector('.prog__axis-best-value')?.textContent,
    ).toContain('70');
  });

  it('compares the last session of each axis with its very first one', async () => {
    const { fixture } = await setup(populatedProgression());
    const deltaOf = (index: number) =>
      axisRow(fixture, index)
        .querySelector('.prog__axis-delta-value')
        ?.textContent?.trim();

    expect(deltaOf(1)).toBe('+18');
    expect(deltaOf(2)).toBe('−9');
    expect(deltaOf(0)).toBe('0');
    expect(deltaOf(4)).toBe('+2');
    expect(
      axisRow(fixture, 1).querySelector('.prog__axis-delta-value--up'),
    ).not.toBeNull();
    expect(
      axisRow(fixture, 2).querySelector('.prog__axis-delta-value--down'),
    ).not.toBeNull();
  });

  it('never shows the thirty-day delta nor a trend arrow', async () => {
    const { fixture } = await setup(populatedProgression());
    const text = textOf(fixture);

    expect(text).not.toContain('+6');
    expect(text).not.toContain('↗');
    expect(text).not.toContain('↘');
  });

  it('carries no axis label beyond its name', async () => {
    const { fixture } = await setup(populatedProgression());
    const text = textOf(fixture);

    expect(text).not.toContain('Axe critique');
    expect(text).not.toContain('À travailler en priorité');
    expect(text).not.toContain('Votre point fort');
    expect(
      fixture.nativeElement.querySelector('.prog__axis-critical'),
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('.prog__axis-priority'),
    ).toBeNull();
  });

  it('draws no threshold rule inside the sparklines', async () => {
    const { fixture } = await setup(populatedProgression());

    expect(
      fixture.nativeElement.querySelectorAll('.prog__axis-spark line'),
    ).toHaveLength(0);
  });

  it('scales each curve on its own sessions so the movement shows', async () => {
    const { fixture } = await setup(populatedProgression());
    const polyline = axisRow(fixture, 2).querySelector(
      'polyline',
    ) as SVGPolylineElement;

    const heights = (polyline.getAttribute('points') ?? '')
      .split(' ')
      .map((pair) => Number(pair.split(',')[1]));
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(10);
  });

  it('announces an axis never played without a sparkline nor figures', async () => {
    const { fixture } = await setup(populatedProgression());
    const motor = axisRow(fixture, 3);

    expect(motor.querySelector('.prog__axis-unplayed')?.textContent).toContain(
      'Aucune session',
    );
    expect(motor.querySelector('.prog__axis-best-value')).toBeNull();
    expect(motor.querySelector('.prog__axis-delta-value')).toBeNull();
    expect(motor.querySelector('polyline')).toBeNull();
  });

  it('routes an axis row to its latest result by session mode', async () => {
    const { fixture, navigate } = await setup(populatedProgression());
    (axisRow(fixture, 1) as HTMLButtonElement).click();
    expect(navigate).toHaveBeenCalledWith([
      '/entrainements/cible',
      'logique',
      'session',
      'targeted-9',
      'resultat',
    ]);
    (axisRow(fixture, 2) as HTMLButtonElement).click();
    expect(navigate).toHaveBeenCalledWith(['/sessions', 'sim-3', 'resultat']);
  });

  it('dates the first and last simulations of the radar in full', async () => {
    const { fixture } = await setup(populatedProgression());
    const text = textOf(fixture);

    expect(text).toContain('Premier examen blanc, le 14/04/2026');
    expect(text).toContain('Dernier examen blanc, le 15/07/2026');
  });

  it('summarizes the badge collection with the latest unlocks first', async () => {
    const { fixture } = await setup(
      populatedProgression(),
      populatedOverview(),
      [
        earnedStatus(BadgeId.LOGIC_PROGRESSION, 60),
        earnedStatus(BadgeId.DISCRIMINATION_PROGRESSION, 40),
        earnedStatus(BadgeId.EXAM_FIRST, 12),
        earnedStatus(BadgeId.DISCRIMINATION_EXCELLENCE, 3),
      ],
    );
    const text = textOf(fixture);
    const latest = [
      ...fixture.nativeElement.querySelectorAll('.prog__latest'),
    ] as HTMLElement[];
    const credits = fixture.nativeElement.querySelector(
      '.prog__collection-credits',
    ) as HTMLElement;

    expect(text).toContain(`4 / ${BADGE_CATALOG.length} badges obtenus`);
    expect(credits.textContent).toContain('+1');
    expect(credits.textContent).toContain('gagné');
    expect(credits.textContent).not.toContain('gagnés');
    expect(latest).toHaveLength(3);
    expect(latest[0].textContent).toContain('Discrimination · Argent');
    expect(latest[0].textContent).toContain('Il y a 3 jours');
    expect(latest[1].textContent).toContain('Examen blanc · Bronze');
    expect(latest[1].textContent).toContain('Il y a 12 jours');
    expect(latest[2].textContent).toContain('Discrimination · Bronze');
    expect(latest[2].textContent).toContain('Il y a 1 mois');
    expect(
      fixture.nativeElement.querySelector('.prog__link')?.getAttribute('href'),
    ).toBe('/badges');
  });

  it('points to the closest score tier still locked among the played axes', async () => {
    const { fixture } = await setup(
      populatedProgression(),
      populatedOverview(),
      [earnedStatus(BadgeId.LOGIC_PROGRESSION, 60)],
    );
    const next = fixture.nativeElement.querySelector(
      '.prog__badges-next',
    ) as HTMLElement;

    expect(next.textContent).toContain('Logique · palier Argent');
    expect(next.textContent).toContain('Meilleur score ≥ 85');
    expect(next.textContent).toContain('Vous êtes à 82, encore 3 pts');
    expect(next.querySelector('.badge-art--locked')).not.toBeNull();
  });

  it('names the closest tier with the short axis label', async () => {
    const { fixture } = await setup(
      populatedProgression(),
      populatedOverview(),
      [
        earnedStatus(BadgeId.LOGIC_PROGRESSION, 60),
        earnedStatus(BadgeId.LOGIC_EXCELLENCE, 30),
      ],
    );
    const next = fixture.nativeElement.querySelector(
      '.prog__badges-next',
    ) as HTMLElement;

    expect(next.textContent).toContain('Discrimination · palier Argent');
    expect(next.textContent).not.toContain('Discrimination visuelle');
    expect(next.textContent).toContain('Vous êtes à 79, encore 6 pts');
  });

  it('keeps the badges card in a loading state until the statuses arrive', async () => {
    const { fixture } = await setup(
      populatedProgression(),
      populatedOverview(),
      null,
    );

    expect(
      fixture.nativeElement.querySelector('.prog__skeleton-stack'),
    ).not.toBeNull();
    expect(textOf(fixture)).not.toContain('badges obtenus');
  });

  it('renders sober empty states for an account without completed sessions', async () => {
    const { fixture } = await setup(emptyProgression(), emptyOverview());
    const text = textOf(fixture);
    expect(text).toContain('Aucun examen blanc terminé');
    expect(text).toContain('Dès votre deuxième examen blanc');
    expect(text).toContain("Aucun examen blanc pour l'instant");
    expect(text).toContain('Aucune session');
    expect(text).toContain(
      'Votre profil par axe se dessinera après votre premier examen blanc.',
    );
    expect(text).toContain("Aucun badge obtenu pour l'instant.");
    expect(text).not.toContain('Prochain palier');
    expect(chartDots(fixture)).toHaveLength(0);
    const rows = fixture.nativeElement.querySelectorAll('.prog__axis-row');
    expect([...rows].every((row) => (row as HTMLButtonElement).disabled)).toBe(
      true,
    );
  });
});
