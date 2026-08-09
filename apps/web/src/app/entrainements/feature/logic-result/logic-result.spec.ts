import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import {
  AxisType,
  BadgeId,
  LOGIC_CONTENT_VERSION_V1,
  LOGIC_CONTENT_VERSION_V2,
  LogicFamily,
  LogicFamilyFilter,
  LogicFamilyResultDto,
  ScoreBand,
  Sector,
  SessionDto,
  SessionMode,
  SessionStatus,
  TargetedLogicResultDto,
} from '@psychotech/shared';
import { of } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { BadgeCelebrationFacade } from '../../../badges/data-access/badge-celebration.facade';
import { BadgesFacade } from '../../../badges/data-access/badges.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { SessionsApi } from '../../../sessions/data-access/sessions.api';
import { TrainingSessionStore } from '../../../sessions/data-access/training-session.store';
import { LogicResult } from './logic-result';

function familyEntry(
  family: LogicFamily,
  overrides: Partial<LogicFamilyResultDto> = {},
): LogicFamilyResultDto {
  return {
    family,
    correct: 8,
    attempted: 10,
    total: 10,
    ratePct: 80,
    timeMs: 120_000,
    marker: null,
    ...overrides,
  };
}

const FULL_SESSION_FAMILIES: LogicFamilyResultDto[] = [
  familyEntry(LogicFamily.NUMERIC, {
    correct: 9,
    ratePct: 90,
    marker: 'STRENGTH',
  }),
  familyEntry(LogicFamily.DOMINO, { correct: 7, ratePct: 70 }),
  familyEntry(LogicFamily.MATRIX_I, { correct: 6, attempted: 9, ratePct: 67 }),
  familyEntry(LogicFamily.MATRIX_II, {
    correct: 3,
    attempted: 8,
    ratePct: 38,
    marker: 'WEAKNESS',
  }),
];

function buildResult(
  overrides: Partial<TargetedLogicResultDto> = {},
): TargetedLogicResultDto {
  return {
    axis: AxisType.LOGIC,
    sessionId: 'session-1',
    sector: Sector.RAILWAY,
    seed: 'seed-1',
    helpEnabled: false,
    score: 62,
    band: ScoreBand.FRAGILE,
    startedAt: '2026-07-16T10:00:00.000Z',
    completedAt: '2026-07-16T10:10:00.000Z',
    bestScore: 80,
    isNewBest: false,
    isEqualBest: false,
    previousBestScore: 70,
    untimed: false,
    items: [
      {
        index: 0,
        answerIndex: null,
        dominoTop: 1,
        dominoBottom: 1,
        timeMs: 4000,
        helpUsed: false,
        visited: true,
      },
    ],
    contentVersion: LOGIC_CONTENT_VERSION_V2,
    logicFamily: LogicFamilyFilter.DOMINO,
    families: [
      familyEntry(LogicFamily.DOMINO, {
        correct: 30,
        attempted: 38,
        total: 40,
        ratePct: 79,
      }),
    ],
    ...overrides,
  };
}

function buildCompletedSession(
  overrides: Partial<SessionDto> = {},
): SessionDto {
  return {
    id: 'session-1',
    mode: SessionMode.TARGETED,
    sector: Sector.RAILWAY,
    status: SessionStatus.COMPLETED,
    seed: 'seed-1',
    contentVersion: LOGIC_CONTENT_VERSION_V2,
    logicFamily: null,
    options: { enabledOptions: [] },
    energyCost: 1,
    currentAxisIndex: 0,
    globalScore: null,
    globalBand: null,
    isAdmissible: null,
    isEliminated: null,
    sectorThreshold: 70,
    startedAt: '2026-07-16T10:00:00.000Z',
    completedAt: '2026-07-16T10:10:00.000Z',
    abandonedAt: null,
    controlModality: null,
    axisResults: [],
    recommendations: [],
    ...overrides,
  };
}

interface SetupOptions {
  activeSession?: SessionDto;
}

interface Setup {
  fixture: ComponentFixture<LogicResult>;
  acknowledgeAll: ReturnType<typeof vi.fn>;
}

function celebrationStub() {
  return {
    holdScene: vi.fn(),
    releaseScene: vi.fn(),
    replay: vi.fn(),
  };
}

async function setupWithBadges(
  result: TargetedLogicResultDto,
  options: SetupOptions = {},
): Promise<Setup> {
  TestBed.resetTestingModule();
  const acknowledgeAll = vi.fn();
  await TestBed.configureTestingModule({
    imports: [LogicResult],
    providers: [
      provideRouter([]),
      {
        provide: SessionsApi,
        useValue: {
          start: vi.fn(),
          get: vi.fn(),
          targetedResult: vi.fn(() => of(result)),
        },
      },
      { provide: BadgesFacade, useValue: { acknowledgeAll } },
      { provide: BadgeCelebrationFacade, useValue: celebrationStub() },
      { provide: EnergyFacade, useValue: { load: vi.fn(() => of(null)) } },
      {
        provide: AuthFacade,
        useValue: { currentUser: () => ({ currentSector: Sector.RAILWAY }) },
      },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { paramMap: convertToParamMap({ sessionId: 'session-1' }) },
        },
      },
    ],
  }).compileComponents();
  if (options.activeSession) {
    TestBed.inject(TrainingSessionStore).setSession(options.activeSession);
  }
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(LogicResult);
  fixture.detectChanges();
  return { fixture, acknowledgeAll };
}

async function setup(
  result: TargetedLogicResultDto,
): Promise<ComponentFixture<LogicResult>> {
  return (await setupWithBadges(result)).fixture;
}

function boundaryCount(fixture: ComponentFixture<LogicResult>): number {
  return fixture.nativeElement.querySelectorAll(
    '[title="Changement de famille"]',
  ).length;
}

describe('LogicResult (contenu v2)', () => {
  it('never mentions the record for a family-filtered session', async () => {
    const fixture = await setup(buildResult());
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).not.toContain('Meilleur score');
    expect(text).not.toContain('record');
  });

  it('never mentions the record for an untimed session', async () => {
    const fixture = await setup(
      buildResult({
        logicFamily: null,
        families: FULL_SESSION_FAMILIES,
        untimed: true,
      }),
    );
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).not.toContain('Meilleur score');
    expect(text).not.toContain('record');
  });

  it('shows only the served family, without marker, for a filtered session', async () => {
    const fixture = await setup(buildResult());
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Par famille');
    expect(text).toContain('Dominos');
    expect(text).toContain('/40');
    expect(text).not.toContain('Numérique');
    expect(text).not.toContain('Matrices');
    expect(text).not.toContain('Votre force');
    expect(text).not.toContain('À travailler');
    expect(fixture.nativeElement.querySelectorAll('.family').length).toBe(1);
  });

  it('keeps the record and renders the four family bars on a full v2 session', async () => {
    const fixture = await setup(
      buildResult({ logicFamily: null, families: FULL_SESSION_FAMILIES }),
    );
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Meilleur score sur cet axe');
    expect(text).toContain('Par famille');
    expect(text).toContain('Numérique');
    expect(text).toContain('Dominos');
    expect(text).toContain('Matrices (lecture)');
    expect(text).toContain('Matrices (déduction)');
    expect(text).not.toContain('Matrices —');
    expect(text).toContain('Votre force');
    expect(text).toContain('À travailler');
  });

  it('renders no family section when the result carries no families', async () => {
    const fixture = await setup(
      buildResult({
        contentVersion: LOGIC_CONTENT_VERSION_V1,
        logicFamily: null,
        items: [],
        families: undefined,
      }),
    );
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).not.toContain('Par famille');
    expect(text).toContain('Meilleur score sur cet axe');
  });

  it('draws three family separators on a standard v2 session', async () => {
    const fixture = await setup(
      buildResult({ logicFamily: null, families: FULL_SESSION_FAMILIES }),
    );
    expect(boundaryCount(fixture)).toBe(3);
  });

  it('draws one separator for a Matrices-filtered session', async () => {
    const fixture = await setup(
      buildResult({
        logicFamily: LogicFamilyFilter.MATRIX,
        families: [
          familyEntry(LogicFamily.MATRIX_I, {
            total: 20,
            correct: 15,
            ratePct: 75,
          }),
          familyEntry(LogicFamily.MATRIX_II, {
            total: 20,
            correct: 12,
            ratePct: 60,
          }),
        ],
      }),
    );
    expect(boundaryCount(fixture)).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.family').length).toBe(2);
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('/20');
    expect(text).not.toContain('Votre force');
    expect(text).not.toContain('À travailler');
  });

  it('draws no separator for a single-family session', async () => {
    const fixture = await setup(buildResult());
    expect(boundaryCount(fixture)).toBe(0);
  });
});

describe('LogicResult - badges débloqués', () => {
  const newBadges = [
    { badgeId: BadgeId.LOGIC_PROGRESSION, earnedAt: '2026-08-07T10:00:00.000Z', gain: null, conditions: [] },
    { badgeId: BadgeId.FIRST_STEPS, earnedAt: '2026-08-07T10:00:00.000Z', gain: 5, conditions: [] },
  ];

  it('announces the earned badges with the coin and the total gain', async () => {
    const { fixture } = await setupWithBadges(
      buildResult({ earnedBadges: newBadges }),
    );
    const card = fixture.nativeElement.querySelector('ui-badge-announce');
    expect(card).not.toBeNull();
    expect(card.textContent).toContain(
      'Cartésien et Premiers pas rejoignent votre collection',
    );
    expect(card.textContent).toContain('+5');
    expect(card.textContent).toContain('crédits ajoutés à votre solde');
    expect(card.querySelector('ui-axis-icon')).not.toBeNull();
  });

  it('announces a single gainless badge with its family and tier', async () => {
    const { fixture } = await setupWithBadges(
      buildResult({
        earnedBadges: [{ badgeId: BadgeId.LOGIC_PROGRESSION, earnedAt: '2026-08-07T10:00:00.000Z', gain: null, conditions: [] }],
      }),
    );
    const card = fixture.nativeElement.querySelector('ui-badge-announce');
    expect(card.textContent).toContain('Cartésien rejoint votre collection');
    expect(card.textContent).toContain("Badge d'axe · Logique · Bronze");
  });

  it('hides the announce card without new badges', async () => {
    const { fixture } = await setupWithBadges(buildResult(), {
      activeSession: buildCompletedSession(),
    });
    expect(fixture.nativeElement.querySelector('ui-badge-announce')).toBeNull();
  });

});
