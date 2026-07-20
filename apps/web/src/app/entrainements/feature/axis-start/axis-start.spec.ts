import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import {
  AxisType,
  LogicFamilyFilter,
  Sector,
  SessionDto,
  SessionMode,
  SessionStatus,
  StartSessionDto,
} from '@psychotech/shared';
import { of } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { CatalogFacade } from '../../../catalog/data-access/catalog.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { SessionsApi } from '../../../sessions/data-access/sessions.api';
import { tutorialSessionProviders } from '../../data-access/tutorial-session.facade';
import { AxisStart } from './axis-start';

function buildSession(): SessionDto {
  return {
    id: 'session-1',
    mode: SessionMode.TARGETED,
    sector: Sector.RAILWAY,
    status: SessionStatus.IN_PROGRESS,
    seed: 'seed-1',
    contentVersion: 2,
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
    completedAt: null,
    abandonedAt: null,
    controlModality: null,
    axisResults: [
      {
        axis: AxisType.LOGIC,
        order: 0,
        normalizedScore: null,
        band: null,
        skipped: false,
        metrics: null,
        startedAt: '2026-07-16T10:00:00.000Z',
        completedAt: null,
      },
    ],
    recommendations: [],
  };
}

interface Setup {
  fixture: ComponentFixture<AxisStart>;
  element: HTMLElement;
  start: ReturnType<typeof vi.fn>;
}

async function setup(axisSlug: string, tutorial = false): Promise<Setup> {
  TestBed.resetTestingModule();
  const start = vi.fn(() => of(buildSession()));
  await TestBed.configureTestingModule({
    imports: [AxisStart],
    providers: [
      provideRouter([]),
      { provide: SessionsApi, useValue: { start, get: vi.fn() } },
      { provide: EnergyFacade, useValue: { load: vi.fn(() => of(null)) } },
      {
        provide: AuthFacade,
        useValue: { currentUser: () => ({ currentSector: Sector.RAILWAY }) },
      },
      {
        provide: CatalogFacade,
        useValue: {
          loadSectorReferential: vi.fn(),
          sectorReferential: () => null,
        },
      },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({ axis: axisSlug }),
            data: tutorial ? { tutorial: true } : {},
          },
        },
      },
      ...(tutorial ? tutorialSessionProviders() : []),
    ],
  }).compileComponents();
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(AxisStart);
  fixture.detectChanges();
  return { fixture, element: fixture.nativeElement, start };
}

function familyChips(element: HTMLElement): HTMLButtonElement[] {
  return Array.from(
    element.querySelectorAll<HTMLButtonElement>('.axis-briefing__family-chip'),
  );
}

function clickStart(result: Setup): void {
  (
    result.element.querySelector('ui-button button') as HTMLButtonElement
  ).click();
  result.fixture.detectChanges();
}

function startPayload(start: ReturnType<typeof vi.fn>): StartSessionDto {
  return start.mock.calls[0][0] as StartSessionDto;
}

describe('AxisStart - option Familles', () => {
  it('offers the four exclusive family choices for the logic axis', async () => {
    const result = await setup('logique');
    const chips = familyChips(result.element);
    expect(chips.map((chip) => chip.textContent?.trim())).toEqual([
      'Tous les blocs',
      'Numérique',
      'Dominos',
      'Matrices',
    ]);
    expect(chips[0].getAttribute('aria-checked')).toBe('true');
    expect(result.element.textContent).toContain('items · 4 familles');
  });

  it('sends the selected family in the session creation payload', async () => {
    const result = await setup('logique');
    familyChips(result.element)[2].click();
    result.fixture.detectChanges();
    expect(result.element.textContent).toContain('items · Dominos');

    clickStart(result);

    expect(result.start).toHaveBeenCalledTimes(1);
    expect(startPayload(result.start).options?.logicFamily).toBe(
      LogicFamilyFilter.DOMINO,
    );
  });

  it('sends a null family when all blocks stay selected', async () => {
    const result = await setup('logique');
    clickStart(result);
    expect(startPayload(result.start).options).toEqual({
      enabledOptions: [],
      logicFamily: null,
    });
  });

  it('never sends a family for another axis', async () => {
    const result = await setup('memoire');
    expect(familyChips(result.element)).toHaveLength(0);
    clickStart(result);
    expect('logicFamily' in (startPayload(result.start).options ?? {})).toBe(
      false,
    );
  });

  it('shows no selector and calls no api for the tutorial', async () => {
    const result = await setup('logique', true);
    expect(familyChips(result.element)).toHaveLength(0);
    clickStart(result);
    expect(result.start).not.toHaveBeenCalled();
  });
});
