import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AxisType,
  LogicFamilyFilter,
  SESSION_ENERGY_COST,
  Sector,
  SessionMode,
  TargetedSessionOptionsDto,
  TrainingOptionId,
} from '@psychotech/shared';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { isEnergyInsufficientError } from '../../../energy/data-access/energy-error';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { GamepadFacade } from '../../../gamepad/data-access/gamepad.facade';
import { GamepadPairing } from '../../../shared/ui/gamepad-pairing/gamepad-pairing';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { ActionFooter } from '../../../shared/ui/action-footer/action-footer';
import { AxisIcon } from '../../../shared/ui/axis-icon/axis-icon';
import { Button } from '../../../shared/ui/button/button';
import { axisFromSlug, axisSlug } from '../../../shared/util/axis-slug';
import {
  GUIDE_LOGIC_RULES_PATH,
  GUIDE_PATH,
  guideAxisAnchor,
} from '../../../guide/util/guide-anchors';
import { axisButtonColor } from '../../../shared/ui/axis-button-color';
import { AxisBriefing } from '../../ui/axis-briefing/axis-briefing';
import { sectorReferentialFor } from '../sector-referential';

@Component({
  selector: 'app-axis-start',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ActionFooter,
    AxisBriefing,
    AxisIcon,
    Button,
    GamepadPairing,
    RouterLink,
  ],
  templateUrl: './axis-start.html',
  styleUrl: './axis-start.css',
})
export class AxisStart {
  private readonly trainingSessionFacade = inject(TrainingSessionFacade);
  private readonly authFacade = inject(AuthFacade);
  private readonly energyFacade = inject(EnergyFacade);
  private readonly gamepad = inject(GamepadFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly starting = signal(false);
  protected readonly enabledOptions = signal<TrainingOptionId[]>([]);
  protected readonly logicFamily = signal<LogicFamilyFilter | null>(null);
  protected readonly energyCost = SESSION_ENERGY_COST[SessionMode.TARGETED];

  protected readonly axis =
    axisFromSlug(this.route.snapshot.paramMap.get('axis')) ?? AxisType.LOGIC;
  protected readonly buttonColor = axisButtonColor(this.axis);
  protected readonly tutorial = this.route.snapshot.data['tutorial'] === true;
  protected readonly showPairing = this.axis === AxisType.MOTOR_SKILLS;
  protected readonly guidePath = GUIDE_PATH;
  protected readonly guideAnchor = guideAxisAnchor(this.axis);
  protected readonly logicRulesPath =
    this.axis === AxisType.LOGIC ? GUIDE_LOGIC_RULES_PATH : null;

  protected readonly showExamGuideLink = computed(
    () => this.authFacade.currentUser()?.examGuideReadAt == null,
  );
  protected readonly showLogicRulesLink = computed(
    () =>
      this.logicRulesPath !== null &&
      this.authFacade.currentUser()?.logicGuideReadAt == null,
  );
  protected readonly showGuideNote = computed(
    () =>
      !this.tutorial &&
      (this.showExamGuideLink() || this.showLogicRulesLink()),
  );

  protected readonly sector = computed(
    () => this.authFacade.currentUser()?.currentSector ?? Sector.RAILWAY,
  );
  private readonly referential = sectorReferentialFor(this.sector);
  protected readonly criticalAxis = computed(
    () =>
      this.referential()?.axes.find((entry) => entry.code === this.axis)
        ?.isCritical ?? false,
  );

  protected readonly energyLocked = computed(
    () =>
      !this.tutorial && this.energyFacade.state()?.canStartAxis === false,
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
      .pipe(takeUntilDestroyed(this.destroyRef))
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
            this.energyFacade
              .load()
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({ error: () => undefined });
          }
        },
      });
  }
}
