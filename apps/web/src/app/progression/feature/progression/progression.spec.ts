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
  UserProfileDto,
} from '@psychotech/shared';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { CatalogFacade } from '../../../catalog/data-access/catalog.facade';
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
      },
      {
        sessionId: 'sim-2',
        date: '2026-06-02T18:00:00.000Z',
        globalScore: 78.2,
        band: ScoreBand.ACCEPTABLE,
      },
      {
        sessionId: 'sim-3',
        date: '2026-07-15T19:42:00.000Z',
        globalScore: 74.8,
        band: ScoreBand.ACCEPTABLE,
      },
    ],
    axes: FULL_SESSION_AXIS_ORDER.map((axis) => ({
      axis,
      currentScore: scores[axis],
      band: ScoreBand.ACCEPTABLE,
      deltaOver30Days: axis === AxisType.LOGIC ? 6 : 2,
      sparkline: [
        { date: '2026-06-01T10:00:00.000Z', score: scores[axis] - 6 },
        { date: '2026-07-15T10:00:00.000Z', score: scores[axis] },
      ],
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

async function setup(progression: ProgressionDto) {
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
    expect(text).toContain('Simulation du');
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

  it('opens the report of a simulation from a curve point', async () => {
    const { fixture, navigate } = await setup(populatedProgression());
    const dot = fixture.nativeElement.querySelector(
      '.prog__chart-desktop circle',
    ) as SVGCircleElement;
    dot.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(navigate).toHaveBeenCalledWith(['/sessions', 'sim-1', 'resultat']);
  });

  it('tags the weakest, critical and strongest axes and shows integer scores', async () => {
    const { fixture } = await setup(populatedProgression());
    const text = textOf(fixture);
    expect(text).toContain('À travailler en priorité');
    expect(text).toContain('Axe critique du ferroviaire');
    expect(text).toContain('Votre point fort');
    expect(text).toContain('82');
    expect(text).toContain('+6');
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
    const { fixture } = await setup(emptyProgression());
    const text = textOf(fixture);
    expect(text).toContain('Aucune simulation complétée');
    expect(text).toContain('Dès votre deuxième simulation');
    expect(text).toContain("Aucune simulation pour l'instant");
    expect(text).toContain('Pas encore joué');
    expect(text).toContain(
      'Votre profil par axe se dessinera après votre première simulation.',
    );
    const rows = fixture.nativeElement.querySelectorAll('.prog__axis-row');
    expect(
      [...rows].every((row) => (row as HTMLButtonElement).disabled),
    ).toBe(true);
  });
});
