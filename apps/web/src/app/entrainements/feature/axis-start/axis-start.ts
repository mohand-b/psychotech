import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AxisType,
  LogicFamilyFilter,
  TargetedSessionOptionsDto,
  TrainingOptionId,
} from '@psychotech/shared';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { GamepadFacade } from '../../../gamepad/data-access/gamepad.facade';
import { GamepadPairing } from '../../../gamepad/ui/gamepad-pairing/gamepad-pairing';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { BoltIcon } from '../../../shared/ui/bolt-icon/bolt-icon';
import { Button } from '../../../shared/ui/button/button';
import { axisFromSlug, axisSlug } from '../../../shared/util/axis-slug';
import { axisButtonColor } from '../../ui/axis-button-color';
import { AxisBriefing } from '../../ui/axis-briefing/axis-briefing';

const TARGETED_AXIS_ENERGY_COST = 1;

@Component({
  selector: 'app-axis-start',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisBriefing, BoltIcon, Button, GamepadPairing],
  templateUrl: './axis-start.html',
  styleUrl: './axis-start.css',
})
export class AxisStart {
  private readonly trainingSessionFacade = inject(TrainingSessionFacade);
  private readonly energyFacade = inject(EnergyFacade);
  private readonly gamepad = inject(GamepadFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly starting = signal(false);
  protected readonly enabledOptions = signal<TrainingOptionId[]>([]);
  protected readonly logicFamily = signal<LogicFamilyFilter | null>(null);
  protected readonly energyCost = TARGETED_AXIS_ENERGY_COST;

  protected readonly axis =
    axisFromSlug(this.route.snapshot.paramMap.get('axis')) ?? AxisType.LOGIC;
  protected readonly buttonColor = axisButtonColor(this.axis);
  protected readonly tutorial = this.route.snapshot.data['tutorial'] === true;
  protected readonly showPairing =
    this.axis === AxisType.MOTOR_SKILLS && !this.tutorial;

  protected readonly energyLocked = computed(
    () => !this.tutorial && this.energyFacade.state()?.canStartAxis === false,
  );

  protected readonly gamepadPairing = this.gamepad.pairing;
  protected readonly gamepadConnected = this.gamepad.connected;
  protected readonly gamepadLatency = this.gamepad.latency;
  protected readonly gamepadLatencyGood = this.gamepad.latencyIsGood;

  constructor() {
    if (axisFromSlug(this.route.snapshot.paramMap.get('axis')) === null) {
      this.router.navigate(['/entrainements'], {
        queryParams: { panel: 'cible' },
      });
    }
    if (this.showPairing) {
      this.destroyRef.onDestroy(() => {
        if (!this.leavingTowardsPlay()) {
          this.gamepad.disconnect();
        }
      });
      if (!this.gamepad.connected()) {
        this.gamepad.pairTutorial();
      }
    }
  }

  private leavingTowardsPlay(): boolean {
    return this.router.url.includes(
      `/entrainements/cible/${axisSlug(this.axis)}/session/`,
    );
  }

  private targetedOptions(): TargetedSessionOptionsDto {
    const options: TargetedSessionOptionsDto = {
      enabledOptions: this.enabledOptions(),
    };
    if (!this.tutorial && this.axis === AxisType.LOGIC) {
      options.logicFamily = this.logicFamily();
    }
    return options;
  }

  protected start(): void {
    if (this.starting() || this.energyLocked()) {
      return;
    }
    this.starting.set(true);
    this.trainingSessionFacade
      .startTargeted(this.axis, this.targetedOptions())
      .subscribe({
        next: (session) =>
          this.router.navigate([
            this.tutorial ? '/entrainements/tutoriel' : '/entrainements/cible',
            axisSlug(this.axis),
            'session',
            session.id,
          ]),
        error: () => this.starting.set(false),
      });
  }
}
