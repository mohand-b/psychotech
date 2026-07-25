import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AxisType,
  LogicFamilyFilter,
  SESSION_ENERGY_COST,
  SessionMode,
  SubscriptionTier,
  TargetedSessionOptionsDto,
  TrainingOptionId,
  energyTopUpPriceEur,
} from '@psychotech/shared';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { isEnergyInsufficientError } from '../../../energy/data-access/energy-error';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { GamepadFacade } from '../../../gamepad/data-access/gamepad.facade';
import { GamepadPairing } from '../../../gamepad/ui/gamepad-pairing/gamepad-pairing';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { BoltIcon } from '../../../shared/ui/bolt-icon/bolt-icon';
import { Button } from '../../../shared/ui/button/button';
import { axisFromSlug, axisSlug } from '../../../shared/util/axis-slug';
import { formatEuroAmount } from '../../../shared/util/subscription-prices';
import { axisButtonColor } from '../../ui/axis-button-color';
import { AxisBriefing } from '../../ui/axis-briefing/axis-briefing';
import { formatRechargeCountdown } from '../entrainements/trainings-overview-view';

const COUNTDOWN_TICK_MS = 30_000;

@Component({
  selector: 'app-axis-start',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisBriefing, BoltIcon, Button, GamepadPairing, RouterLink],
  templateUrl: './axis-start.html',
  styleUrl: './axis-start.css',
})
export class AxisStart {
  private readonly trainingSessionFacade = inject(TrainingSessionFacade);
  private readonly coreFacade = inject(CoreFacade);
  private readonly energyFacade = inject(EnergyFacade);
  private readonly gamepad = inject(GamepadFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly starting = signal(false);
  protected readonly enabledOptions = signal<TrainingOptionId[]>([]);
  protected readonly logicFamily = signal<LogicFamilyFilter | null>(null);
  protected readonly energyCost = SESSION_ENERGY_COST[SessionMode.TARGETED];
  private readonly now = signal(new Date());

  protected readonly axis =
    axisFromSlug(this.route.snapshot.paramMap.get('axis')) ?? AxisType.LOGIC;
  protected readonly buttonColor = axisButtonColor(this.axis);
  protected readonly tutorial = this.route.snapshot.data['tutorial'] === true;
  protected readonly showPairing = this.axis === AxisType.MOTOR_SKILLS;

  protected readonly unlimited = computed(
    () => this.coreFacade.tier() === SubscriptionTier.UNLIMITED,
  );

  protected readonly energyLocked = computed(
    () =>
      !this.tutorial &&
      !this.unlimited() &&
      this.energyFacade.state()?.canStartAxis === false,
  );

  protected readonly rechargePriceLabel = computed(() => {
    const balance = this.energyFacade.state()?.balance ?? 0;
    return `${formatEuroAmount(energyTopUpPriceEur(balance))} €`;
  });

  protected readonly rechargeCountdown = computed(() => {
    const resetsAt = this.energyFacade.state()?.resetsAt;
    return resetsAt ? formatRechargeCountdown(resetsAt, this.now()) : null;
  });

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
    const intervalId = setInterval(
      () => this.now.set(new Date()),
      COUNTDOWN_TICK_MS,
    );
    this.destroyRef.onDestroy(() => clearInterval(intervalId));
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
    const slug = axisSlug(this.axis);
    return (
      this.router.url.includes(`/entrainements/cible/${slug}/session/`) ||
      this.router.url.includes(`/entrainements/tutoriel/${slug}/session/`)
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
        error: (error: unknown) => {
          this.starting.set(false);
          if (isEnergyInsufficientError(error)) {
            this.energyFacade.load().subscribe({ error: () => undefined });
          }
        },
      });
  }
}
