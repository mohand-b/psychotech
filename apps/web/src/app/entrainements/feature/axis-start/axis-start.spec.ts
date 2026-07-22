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
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { GamepadFacade } from '../../../gamepad/data-access/gamepad.facade';
import { SessionsApi } from '../../../sessions/data-access/sessions.api';
import { tutorialSessionProviders } from '../../data-access/tutorial-session.facade';
import { AxisStart } from './axis-start';

function gamepadFacadeStub() {
  return {
    pairing: signal(null),
    connected: signal(false),
    latency: signal(null),
    latencyIsGood: signal(true),
    pairTutorial: vi.fn(),
    disconnect: vi.fn(),
  };
}

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
  gamepad: ReturnType<typeof gamepadFacadeStub>;
}

async function setup(axisSlug: string, tutorial = false): Promise<Setup> {
  TestBed.resetTestingModule();
  const start = vi.fn(() => of(buildSession()));
  const gamepad = gamepadFacadeStub();
  await TestBed.configureTestingModule({
    imports: [AxisStart],
    providers: [
      provideRouter([]),
      { provide: GamepadFacade, useValue: gamepad },
      { provide: SessionsApi, useValue: { start, get: vi.fn() } },
      {
        provide: EnergyFacade,
        useValue: { load: vi.fn(() => of(null)), state: signal(null) },
      },
      {
        provide: AuthFacade,
        useValue: { currentUser: () => ({ currentSector: Sector.RAILWAY }) },
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
  return { fixture, element: fixture.nativeElement, start, gamepad };
}

function familySegments(element: HTMLElement): HTMLButtonElement[] {
  return Array.from(
    element.querySelectorAll<HTMLButtonElement>(
      '.axis-briefing__family-segment',
    ),
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
    const segments = familySegments(result.element);
    expect(segments.map((segment) => segment.textContent?.trim())).toEqual([
      'Tous les blocs',
      'Numérique',
      'Dominos',
      'Matrices',
    ]);
    expect(segments[0].getAttribute('aria-checked')).toBe('true');
    expect(result.element.textContent).toContain('familles d’items');
  });

  it('sends the selected family in the session creation payload', async () => {
    const result = await setup('logique');
    familySegments(result.element)[2].click();
    result.fixture.detectChanges();
    expect(
      familySegments(result.element)[2].getAttribute('aria-checked'),
    ).toBe('true');

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
    expect(familySegments(result.element)).toHaveLength(0);
    clickStart(result);
    expect('logicFamily' in (startPayload(result.start).options ?? {})).toBe(
      false,
    );
  });

  it('shows no selector and calls no api for the discovery mode', async () => {
    const result = await setup('logique', true);
    expect(familySegments(result.element)).toHaveLength(0);
    clickStart(result);
    expect(result.start).not.toHaveBeenCalled();
  });

  it('pairs the phone gamepad from the motricity briefing, targeted only', async () => {
    const targeted = await setup('motricite');
    expect(targeted.gamepad.pairTutorial).toHaveBeenCalledTimes(1);
    expect(
      targeted.element.querySelector('ui-gamepad-pairing'),
    ).not.toBeNull();

    const discovery = await setup('motricite', true);
    expect(discovery.gamepad.pairTutorial).not.toHaveBeenCalled();
    expect(discovery.element.querySelector('ui-gamepad-pairing')).toBeNull();

    const other = await setup('logique');
    expect(other.gamepad.pairTutorial).not.toHaveBeenCalled();
  });

  it('labels the discovery call to action without the word tutoriel', async () => {
    const result = await setup('logique', true);
    const button = result.element.querySelector(
      'ui-button button',
    ) as HTMLButtonElement;
    expect(button.textContent).toContain('Commencer la découverte');
    expect(result.element.textContent).toContain(
      'La découverte est toujours identique et ne consomme aucune énergie.',
    );
    expect(result.element.textContent?.toLowerCase()).not.toContain(
      'tutoriel',
    );
  });
});
