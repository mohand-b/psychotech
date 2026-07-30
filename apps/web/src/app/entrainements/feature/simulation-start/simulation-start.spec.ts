import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import {
  AxisType,
  ENERGY_INSUFFICIENT_ERROR_CODE,
  EnergyStateDto,
  FULL_SESSION_AXIS_ORDER,
  Sector,
  SubscriptionTier,
} from '@psychotech/shared';
import { Observable, of, throwError } from 'rxjs';
import { SIMULATION_COURSE } from './simulation-course-instructions';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { SimulationStart } from './simulation-start';

function buildEnergyState(
  overrides: Partial<EnergyStateDto> = {},
): EnergyStateDto {
  return {
    balance: 5,
    capacity: 5,
    tier: SubscriptionTier.ESSENTIAL,
    resetsAt: '2026-07-17T00:00:00.000Z',
    canStartFull: true,
    canStartAxis: true,
    ...overrides,
  };
}

async function setup(
  options: {
    energyState?: EnergyStateDto | null;
    tier?: SubscriptionTier;
    startFull?: () => Observable<{ id: string }>;
  } = {},
) {
  const energyLoad = vi.fn(() => of(null));
  const startFull = vi.fn(
    options.startFull ?? (() => of({ id: 'session-1' })),
  );
  await TestBed.configureTestingModule({
    imports: [SimulationStart],
    providers: [
      provideRouter([]),
      {
        provide: AuthFacade,
        useValue: { currentUser: () => ({ currentSector: Sector.RAILWAY }) },
      },
      {
        provide: CoreFacade,
        useValue: {
          tier: signal(options.tier ?? SubscriptionTier.ESSENTIAL),
        },
      },
      {
        provide: EnergyFacade,
        useValue: {
          state: signal(options.energyState ?? buildEnergyState()),
          load: energyLoad,
        },
      },
      { provide: TrainingSessionFacade, useValue: { startFull } },
    ],
  }).compileComponents();
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(SimulationStart);
  fixture.detectChanges();
  return { fixture, startFull, navigate, energyLoad };
}

function text(fixture: { nativeElement: HTMLElement }): string {
  return fixture.nativeElement.textContent ?? '';
}

describe('SimulationStart', () => {
  it('briefs the full session with its cost and starts it', async () => {
    const { fixture, startFull, navigate } = await setup();
    expect(text(fixture)).toContain('Examen blanc');
    expect(text(fixture)).toContain('Comment ça se passe');
    expect(text(fixture)).toContain('axes en Ferroviaire');
    expect(text(fixture)).toContain('notation pondérée Ferroviaire');
    const cta = fixture.nativeElement.querySelector(
      '.simb__cta',
    ) as HTMLButtonElement;
    expect(cta.textContent).toContain('Commencer la session');
    expect(cta.querySelector('ui-bolt')).not.toBeNull();

    cta.click();
    expect(startFull).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith([
      '/entrainements/examen-blanc/session',
      'session-1',
    ]);
  });

  it('shows the explorer course with the first axis selected and its instruction', async () => {
    const { fixture } = await setup();
    const desktopSteps = fixture.nativeElement.querySelectorAll(
      '.simb__stepper--desktop button.step',
    );
    expect(desktopSteps).toHaveLength(FULL_SESSION_AXIS_ORDER.length);
    expect(desktopSteps[0].getAttribute('aria-current')).toBe('true');
    expect(text(fixture)).toContain(
      SIMULATION_COURSE[AxisType.LOGIC].instruction,
    );
    expect(text(fixture)).toContain(SIMULATION_COURSE[AxisType.LOGIC].duration);
  });

  it('previews another axis on hover then reverts, and persists it on click', async () => {
    const { fixture } = await setup();
    const desktopSteps = fixture.nativeElement.querySelectorAll(
      '.simb__stepper--desktop button.step',
    );
    const memoryStep = desktopSteps[1] as HTMLButtonElement;

    memoryStep.dispatchEvent(new Event('pointerenter'));
    fixture.detectChanges();
    expect(text(fixture)).toContain(
      SIMULATION_COURSE[AxisType.MEMORY].instruction,
    );

    memoryStep.dispatchEvent(new Event('pointerleave'));
    fixture.detectChanges();
    expect(text(fixture)).toContain(
      SIMULATION_COURSE[AxisType.LOGIC].instruction,
    );

    memoryStep.dispatchEvent(new Event('pointerenter'));
    memoryStep.click();
    memoryStep.dispatchEvent(new Event('pointerleave'));
    fixture.detectChanges();
    expect(memoryStep.getAttribute('aria-current')).toBe('true');
    expect(text(fixture)).toContain(
      SIMULATION_COURSE[AxisType.MEMORY].instruction,
    );
  });

  it('locks the launch and offers the recharge path when energy is short', async () => {
    const { fixture, startFull } = await setup({
      energyState: buildEnergyState({ balance: 3, canStartFull: false }),
    });
    const locked = fixture.nativeElement.querySelector(
      '.simb__cta button',
    ) as HTMLButtonElement;
    expect(locked.disabled).toBe(true);
    expect(text(fixture)).toContain(
      'Il vous faut 5 énergies, vous en avez 3.',
    );
    const link = fixture.nativeElement.querySelector('.simb__short-link');
    expect(link?.textContent).toContain('Recharger pour 1,00 €');
    expect(link?.getAttribute('href')).toBe('/recharge');
    expect(text(fixture)).toContain('ou attendez la recharge dans');
    (locked as HTMLElement).click();
    expect(startFull).not.toHaveBeenCalled();
  });

  it('hides the energy cost for the unlimited tier', async () => {
    const { fixture } = await setup({
      tier: SubscriptionTier.UNLIMITED,
      energyState: buildEnergyState({ tier: SubscriptionTier.UNLIMITED }),
    });
    const cta = fixture.nativeElement.querySelector(
      '.simb__cta',
    ) as HTMLElement;
    expect(cta.querySelector('ui-bolt')).toBeNull();
    expect((cta.querySelector('button') as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('handles the backend insufficient-energy refusal by reloading the balance', async () => {
    const { fixture, energyLoad } = await setup({
      startFull: () =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 403,
              error: {
                message: ENERGY_INSUFFICIENT_ERROR_CODE,
                balance: 2,
                cost: 5,
              },
            }),
        ),
    });
    (
      fixture.nativeElement.querySelector('.simb__cta') as HTMLButtonElement
    ).click();
    expect(energyLoad).toHaveBeenCalled();
  });
});
