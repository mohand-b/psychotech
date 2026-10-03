import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AxisType,
  Sector,
  SessionDto,
  SessionMode,
  SessionStatus,
} from '@psychotech/shared';
import { GamepadFacade } from '../../../gamepad/data-access/gamepad.facade';
import { GamepadPairing } from '../../../shared/ui/gamepad-pairing/gamepad-pairing';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { ActionFooter } from '../../../shared/ui/action-footer/action-footer';
import { Button } from '../../../shared/ui/button/button';
import { resolveAxisSlug } from '../../../shared/util/axis-slug';
import { resolveAxisButtonColor } from '../../../shared/ui/axis-button-color';
import { AxisBriefing } from '../../ui/axis-briefing/axis-briefing';
import { syncSectorReferential } from '../sector-referential';
import {
  buildSimulationResultRoute,
  buildSimulationSessionRoute,
} from '../../../shared/util/session-links';

@Component({
  selector: 'app-simulation-briefing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ActionFooter, AxisBriefing, Button, GamepadPairing],
  templateUrl: './simulation-briefing.html',
  styleUrl: './simulation-briefing.css',
})
export class SimulationBriefing {
  private readonly facade = inject(TrainingSessionFacade);
  private readonly gamepad = inject(GamepadFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly sessionId =
    this.route.snapshot.paramMap.get('sessionId') ?? '';

  protected readonly loaded = signal(false);
  protected readonly axis = this.facade.axis;

  protected readonly sector = computed(
    () => this.facade.session()?.sector ?? Sector.RAILWAY,
  );
  private readonly referential = syncSectorReferential(
    computed(() => this.facade.session()?.sector ?? null),
  );
  protected readonly criticalAxis = computed(() => {
    const axis = this.axis();
    return axis
      ? (this.referential()?.axes.find((entry) => entry.code === axis)
          ?.isCritical ?? false)
      : false;
  });

  protected readonly motricityAxis = computed(
    () => this.axis() === AxisType.MOTOR_SKILLS,
  );

  protected readonly buttonColor = computed(() => {
    const axis = this.axis();
    return axis ? resolveAxisButtonColor(axis) : 'brand';
  });

  protected readonly gamepadPairing = this.gamepad.pairing;
  protected readonly gamepadConnected = this.gamepad.connected;
  protected readonly gamepadLatency = this.gamepad.latency;
  protected readonly gamepadLatencyGood = this.gamepad.latencyIsGood;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (!this.isLeavingTowardsAxisPlay()) {
        this.gamepad.disconnectGamepad();
      }
    });
    const active = this.facade.session();
    if (active?.id === this.sessionId) {
      this.showBriefingOrRedirect(active);
    } else {
      this.facade
        .loadSession(this.sessionId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (session) => this.showBriefingOrRedirect(session),
          error: () => this.router.navigate(['/entrainements']),
        });
    }
  }

  protected navigateToCurrentAxisPlay(): void {
    const axis = this.axis();
    if (!this.loaded() || !axis) {
      return;
    }
    this.router.navigate([
      ...buildSimulationSessionRoute(this.sessionId),
      'axe',
      resolveAxisSlug(axis),
    ]);
  }

  private isLeavingTowardsAxisPlay(): boolean {
    return this.router.url.startsWith(
      `/entrainements/examen-blanc/session/${this.sessionId}/axe/`,
    );
  }

  private showBriefingOrRedirect(session: SessionDto): void {
    if (session.mode !== SessionMode.FULL) {
      this.router.navigate(['/entrainements'], { replaceUrl: true });
      return;
    }
    if (session.status === SessionStatus.COMPLETED) {
      this.router.navigate(buildSimulationResultRoute(session.id), {
        replaceUrl: true,
      });
      return;
    }
    if (session.status !== SessionStatus.IN_PROGRESS) {
      this.router.navigate(['/entrainements'], { replaceUrl: true });
      return;
    }
    this.loaded.set(true);
    if (this.motricityAxis() && !this.gamepad.connected()) {
      this.gamepad.pairSessionGamepad(this.sessionId);
    }
  }
}
