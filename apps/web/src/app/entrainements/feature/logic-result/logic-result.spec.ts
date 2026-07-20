import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import {
  AxisType,
  LOGIC_CONTENT_VERSION_V1,
  LOGIC_CONTENT_VERSION_V2,
  LogicFamily,
  LogicFamilyFilter,
  LogicFamilyResultDto,
  ScoreBand,
  Sector,
  TargetedLogicResultDto,
} from '@psychotech/shared';
import { of } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { SessionsApi } from '../../../sessions/data-access/sessions.api';
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
  familyEntry(LogicFamily.NUMERIC, { correct: 9, ratePct: 90, marker: 'STRENGTH' }),
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

async function setup(
  result: TargetedLogicResultDto,
): Promise<ComponentFixture<LogicResult>> {
  TestBed.resetTestingModule();
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
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(LogicResult);
  fixture.detectChanges();
  return fixture;
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
    expect(
      fixture.nativeElement.querySelectorAll('.family').length,
    ).toBe(1);
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
          familyEntry(LogicFamily.MATRIX_I, { total: 20, correct: 15, ratePct: 75 }),
          familyEntry(LogicFamily.MATRIX_II, { total: 20, correct: 12, ratePct: 60 }),
        ],
      }),
    );
    expect(boundaryCount(fixture)).toBe(1);
    expect(
      fixture.nativeElement.querySelectorAll('.family').length,
    ).toBe(2);
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
