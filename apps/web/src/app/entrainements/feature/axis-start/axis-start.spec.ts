import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import {
  AxisType,
  ENERGY_INSUFFICIENT_ERROR_CODE,
  EnergyStateDto,
  LogicFamilyFilter,
  Sector,
  SessionDto,
  SessionMode,
  SessionStatus,
  StartSessionDto,
} from '@psychotech/shared';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { BadgesFacade } from '../../../badges/data-access/badges.facade';
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
  energyLoad: ReturnType<typeof vi.fn>;
  notifyTutorialDiscovered: ReturnType<typeof vi.fn>;
}

interface SetupOptions {
  energyState?: EnergyStateDto | null;
  startResult?: () => Observable<SessionDto>;
  emailVerifiedAt?: string | null;
}

async function setup(
  axisSlug: string,
  tutorial = false,
  options: SetupOptions = {},
): Promise<Setup> {
  TestBed.resetTestingModule();
  const start = vi.fn(options.startResult ?? (() => of(buildSession())));
  const gamepad = gamepadFacadeStub();
  const energyLoad = vi.fn(() => of(null));
  const notifyTutorialDiscovered = vi.fn();
  await TestBed.configureTestingModule({
    imports: [AxisStart],
    providers: [
      provideRouter([]),
      { provide: BadgesFacade, useValue: { notifyTutorialDiscovered } },
      { provide: GamepadFacade, useValue: gamepad },
      { provide: SessionsApi, useValue: { start, get: vi.fn() } },
      {
        provide: EnergyFacade,
        useValue: {
          load: energyLoad,
          state: signal(options.energyState ?? null),
        },
      },
      {
        provide: AuthFacade,
        useValue: {
          currentUser: () => ({
            currentSector: Sector.RAILWAY,
            emailVerifiedAt:
              options.emailVerifiedAt === undefined
                ? '2026-07-01T00:00:00.000Z'
                : options.emailVerifiedAt,
          }),
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
  return {
    fixture,
    element: fixture.nativeElement,
    start,
    gamepad,
    energyLoad,
    notifyTutorialDiscovered,
  };
}

function buildEnergyState(
  overrides: Partial<EnergyStateDto> = {},
): EnergyStateDto {
  return {
    balance: 5,
    canStartFull: true,
    canStartAxis: true,
    ...overrides,
  };
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
    expect(familySegments(result.element)[2].getAttribute('aria-checked')).toBe(
      'true',
    );

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

  it('pairs the phone gamepad from every motricity briefing, discovery included', async () => {
    const targeted = await setup('motricite');
    expect(targeted.gamepad.pairTutorial).toHaveBeenCalledTimes(1);
    expect(targeted.element.querySelector('ui-gamepad-pairing')).not.toBeNull();

    const discovery = await setup('motricite', true);
    expect(discovery.gamepad.pairTutorial).toHaveBeenCalledTimes(1);
    expect(
      discovery.element.querySelector('ui-gamepad-pairing'),
    ).not.toBeNull();

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
      'La découverte est toujours identique et ne consomme aucun crédit.',
    );
    expect(result.element.textContent?.toLowerCase()).not.toContain('tutoriel');
  });
});

describe('AxisStart - badge tutoriel', () => {
  it('signals the discovered tutorial when the briefing opens in discovery mode', async () => {
    const result = await setup('logique', true);
    expect(result.notifyTutorialDiscovered).toHaveBeenCalledTimes(1);
  });

  it('signals nothing outside the discovery mode', async () => {
    const result = await setup('logique');
    expect(result.notifyTutorialDiscovered).not.toHaveBeenCalled();
  });
});

describe('AxisStart - crédits', () => {
  it('locks the launch with a recharge path when the balance is empty', async () => {
    const result = await setup('logique', false, {
      energyState: buildEnergyState({ balance: 0, canStartAxis: false }),
    });

    expect(
      result.element.querySelector<HTMLButtonElement>('.axis-start__cta button')
        ?.disabled,
    ).toBe(true);
    expect(result.element.textContent).toContain(
      "Vous n'avez plus assez de crédits.",
    );
    const link = result.element.querySelector('.axis-start__recharge-link');
    expect(link?.textContent).toContain('Recharger des crédits');
    expect(link?.getAttribute('href')).toBe('/credits');
    expect(result.element.textContent).not.toContain('recharge dans');
    expect(result.element.textContent).not.toContain("pour aujourd'hui");
  });

  it('shows the energy cost on the launch call to action', async () => {
    const result = await setup('logique', false, {
      energyState: buildEnergyState(),
    });
    const button = result.element.querySelector('ui-button button');
    expect(button?.textContent).toContain('Commencer');
    expect(button?.textContent).toContain("l'entraînement");
    expect(button?.querySelector('ui-axis-icon')).not.toBeNull();
  });

  it('handles the backend insufficient-energy refusal by reloading the balance', async () => {
    const result = await setup('logique', false, {
      energyState: buildEnergyState({ balance: 1 }),
      startResult: () =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 403,
              error: {
                message: ENERGY_INSUFFICIENT_ERROR_CODE,
                balance: 0,
                cost: 1,
              },
            }),
        ),
    });

    clickStart(result);

    expect(result.energyLoad).toHaveBeenCalled();
  });
});

describe('AxisStart - vérification e-mail', () => {
  it('locks the launch with a verification path when the email is unverified', async () => {
    const result = await setup('logique', false, {
      emailVerifiedAt: null,
      energyState: buildEnergyState({ balance: 0, canStartAxis: false }),
    });

    expect(
      result.element.querySelector<HTMLButtonElement>('.axis-start__cta button')
        ?.disabled,
    ).toBe(true);
    expect(result.element.textContent).toContain(
      'Vérifiez votre adresse e-mail pour lancer une séance.',
    );
    const link = result.element.querySelector('.axis-start__recharge-link');
    expect(link?.getAttribute('href')).toBe('/verification-email');
    expect(result.element.textContent).not.toContain(
      "Vous n'avez plus assez de crédits.",
    );

    clickStart(result);
    expect(result.start).not.toHaveBeenCalled();
  });

  it('keeps the discovery mode open for an unverified account', async () => {
    const result = await setup('logique', true, { emailVerifiedAt: null });

    expect(
      result.element.querySelector<HTMLButtonElement>('.axis-start__cta button')
        ?.disabled,
    ).toBe(false);
    expect(result.element.textContent).not.toContain(
      'Vérifiez votre adresse e-mail',
    );
  });
});
