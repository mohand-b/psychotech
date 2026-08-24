import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import {
  AxisType,
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

// Les dates sont relatives à maintenant : la fenêtre de 30 jours de la page se
// lit sur l'horloge réelle, un jeu de dates figées sortirait de la fenêtre.
function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

// Un historique par axe pour couvrir les quatre états de tendance de la spec.
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
) {
  await TestBed.configureTestingModule({
    imports: [Progression],
    providers: [
      provideRouter([]),
      { provide: AuthFacade, useValue: { currentUser: signal(USER) } },
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
              load: vi.fn(),
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

describe('Progression', () => {
  it('renders the four aggregates with french formats', async () => {
    const { fixture } = await setup(populatedProgression());
    const text = textOf(fixture);
    expect(text).toContain('74,8');
    expect(text).toContain('78,2');
    expect(text).toContain('Examen blanc du');
    expect(text).toContain('2 juin');
    expect(text).toContain('+10,6');
    expect(text).toContain('De 64,2 à 74,8');
    expect(text).toContain('23');
    expect(text).toContain('8');
    expect(text).toContain('15');
    expect(text).toContain('depuis le 14 avril');
  });

  it('draws the evolution curve with one band-colored dot per simulation', async () => {
    const { fixture } = await setup(populatedProgression());
    const desktop = fixture.nativeElement.querySelector('.prog__chart-desktop');
    expect(desktop.querySelectorAll('circle')).toHaveLength(3);
    expect(desktop.querySelector('polyline')).not.toBeNull();
    expect(textOf(fixture)).toContain("Seuil d'admissibilité Ferroviaire 70");
  });

  it('paints an eliminated simulation red even above the admissibility threshold', async () => {
    const progression = populatedProgression();
    const admitted = progression.evolution[1];
    const eliminated = progression.evolution[2];
    eliminated.isEliminated = true;
    expect(admitted.globalScore).toBeGreaterThan(70);
    expect(eliminated.globalScore).toBeGreaterThan(70);

    const { fixture } = await setup(progression);
    const dots = fixture.nativeElement.querySelectorAll(
      '.prog__chart-desktop circle',
    ) as NodeListOf<SVGCircleElement>;

    expect(dots[1].getAttribute('fill')).toBe('var(--rating-good)');
    expect(dots[2].getAttribute('fill')).toBe('var(--rating-bad)');
  });

  it('opens the report of a simulation from a curve point', async () => {
    const { fixture, navigate } = await setup(populatedProgression());
    const dot = fixture.nativeElement.querySelector(
      '.prog__chart-desktop circle',
    ) as SVGCircleElement;
    dot.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(navigate).toHaveBeenCalledWith(['/sessions', 'sim-1', 'resultat']);
  });

  it('leads each axis with its best score, never with the last session', async () => {
    const { fixture } = await setup(populatedProgression());
    const rows = fixture.nativeElement.querySelectorAll('.prog__axis-row');

    // Discrimination : meilleur 79, dernière session 78.
    const discrimination = rows[2] as HTMLElement;
    expect(
      discrimination.querySelector('.prog__axis-score-value')?.textContent,
    ).toContain('79');
    expect(
      discrimination.querySelector('.prog__axis-last')?.textContent,
    ).toContain('78');
  });

  it('shows an arrow built on two rolling averages, never a delta between two sessions', async () => {
    const { fixture } = await setup(populatedProgression());
    const rows = fixture.nativeElement.querySelectorAll('.prog__axis-row');
    const arrowOf = (index: number) =>
      (rows[index] as HTMLElement)
        .querySelector('.prog__axis-trend')
        ?.textContent?.trim() ?? null;

    expect(arrowOf(0)).toBe('↗');
    expect(arrowOf(1)).toBe('↘');
    expect(arrowOf(2)).toBe('→');
    expect(textOf(fixture)).not.toContain('+6');
  });

  it('stays silent on the trend below four sessions in the window', async () => {
    const { fixture } = await setup(populatedProgression());
    const rows = fixture.nativeElement.querySelectorAll('.prog__axis-row');

    // Réactivité : 2 sessions seulement.
    expect(
      (rows[3] as HTMLElement).querySelector('.prog__axis-trend'),
    ).toBeNull();
    expect(
      (rows[3] as HTMLElement).querySelector('.prog__axis-score-value')
        ?.textContent,
    ).toContain('70');
  });

  it('separates the sector property from the diagnosis, never merged', async () => {
    const { fixture } = await setup(populatedProgression());
    const rows = fixture.nativeElement.querySelectorAll('.prog__axis-row');

    // Mémoire : meilleur score 61, sous le seuil de vigilance de 65.
    expect(
      (rows[1] as HTMLElement).querySelector('.prog__axis-priority')
        ?.textContent,
    ).toContain('À travailler en priorité');
    expect(
      (rows[1] as HTMLElement).querySelector('.prog__axis-critical'),
    ).toBeNull();

    // Réactivité : axe critique du secteur, meilleur score au-dessus de 65.
    expect(
      (rows[3] as HTMLElement).querySelector('.prog__axis-critical')
        ?.textContent,
    ).toContain('Axe critique');
    expect(
      (rows[3] as HTMLElement).querySelector('.prog__axis-priority'),
    ).toBeNull();
  });

  it('gives the five sparklines the same scale and the same threshold line', async () => {
    const { fixture } = await setup(populatedProgression());
    const lines = fixture.nativeElement.querySelectorAll(
      '.prog__axis-spark-threshold',
    ) as NodeListOf<SVGLineElement>;

    expect(lines).toHaveLength(5);
    const heights = Array.from(lines).map((line) => line.getAttribute('y1'));
    expect(new Set(heights).size).toBe(1);
    // Seuil 70 sur une échelle fixe 0-100 entre y=24 et y=4.
    expect(heights[0]).toBe('10');
  });

  it('announces an axis never played without a sparkline nor a trend', async () => {
    const { fixture } = await setup(populatedProgression());
    const motor = fixture.nativeElement.querySelectorAll('.prog__axis-row')[4];

    expect(motor.querySelector('.prog__axis-unplayed')?.textContent).toContain(
      'Aucune session',
    );
    expect(motor.querySelector('.prog__axis-score-value')).toBeNull();
    expect(motor.querySelector('.prog__axis-trend')).toBeNull();
    expect(motor.querySelector('polyline')).toBeNull();
  });

  it('routes an axis row to its latest result by session mode', async () => {
    const { fixture, navigate } = await setup(populatedProgression());
    const rows = fixture.nativeElement.querySelectorAll('.prog__axis-row');
    (rows[0] as HTMLButtonElement).click();
    expect(navigate).toHaveBeenCalledWith([
      '/entrainements/cible',
      'logique',
      'session',
      'targeted-9',
      'resultat',
    ]);
    (rows[1] as HTMLButtonElement).click();
    expect(navigate).toHaveBeenCalledWith(['/sessions', 'sim-3', 'resultat']);
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
    const rows = fixture.nativeElement.querySelectorAll('.prog__axis-row');
    expect([...rows].every((row) => (row as HTMLButtonElement).disabled)).toBe(
      true,
    );
  });
});
