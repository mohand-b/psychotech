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
  LogicFamilyFilter,
  ScoreBand,
  Sector,
  TargetedLogicResultDto,
} from '@psychotech/shared';
import { of } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { SessionsApi } from '../../../sessions/data-access/sessions.api';
import { LogicResult } from './logic-result';

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
    previousScore: 70,
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

describe('LogicResult (contenu v2)', () => {
  it('never mentions the record for a family-filtered session', async () => {
    const fixture = await setup(buildResult());
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).not.toContain('Meilleur score');
    expect(text).not.toContain('record');
  });

  it('shows only the families present in a filtered session breakdown', async () => {
    const fixture = await setup(buildResult());
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Par famille');
    expect(text).toContain('Dominos');
    expect(text).not.toContain('Numérique');
    expect(text).not.toContain('Matrices');
  });

  it('keeps the record and ventilates the four families on a full v2 session', async () => {
    const fixture = await setup(buildResult({ logicFamily: null }));
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Meilleur score sur cet axe');
    expect(text).toContain('Par famille');
    expect(text).toContain('Numérique');
    expect(text).toContain('Dominos');
    expect(text).toContain('Matrices — lecture');
    expect(text).toContain('Matrices — déduction');
  });

  it('shows no family breakdown for a v1 session', async () => {
    const fixture = await setup(
      buildResult({
        contentVersion: LOGIC_CONTENT_VERSION_V1,
        logicFamily: null,
        items: [],
      }),
    );
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).not.toContain('Par famille');
    expect(text).toContain('Meilleur score sur cet axe');
  });
});
