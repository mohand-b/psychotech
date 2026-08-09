import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import {
  AxisType,
  FULL_SESSION_AXIS_ORDER,
  FULL_SESSION_LABEL,
  RailwayPlayableAxis,
  Sector,
  SESSION_ENERGY_COST,
  SessionMode,
} from '@psychotech/shared';
import {
  BellOff,
  Clock,
  LucideIconData,
  Timer,
  VolumeX,
} from 'lucide-angular';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { isEnergyInsufficientError } from '../../../energy/data-access/energy-error';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { ActionFooter } from '../../../shared/ui/action-footer/action-footer';
import {
  AXIS_ICON_SIZE,
  AxisIcon,
} from '../../../shared/ui/axis-icon/axis-icon';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { Button } from '../../../shared/ui/button/button';
import { ChevronStepper } from '../../../shared/ui/chevron-stepper/chevron-stepper';
import { Icon } from '../../../shared/ui/icon/icon';
import { SECTOR_PRESENTATION } from '../../../shared/ui/sector-presentation';
import { SIMULATION_COURSE } from './simulation-course-instructions';

const ESTIMATED_DURATION_LABEL = '~25 min';

interface AdviceItem {
  icon: LucideIconData;
  text: string;
}

@Component({
  selector: 'app-simulation-start',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ActionFooter,
    AxisIcon,
    Button,
    ChevronStepper,
    Icon,
    NgTemplateOutlet,
    RouterLink,
  ],
  templateUrl: './simulation-start.html',
  styleUrl: './simulation-start.css',
})
export class SimulationStart {
  private readonly authFacade = inject(AuthFacade);
  private readonly destroyRef = inject(DestroyRef);
  private readonly energyFacade = inject(EnergyFacade);
  private readonly trainingSessionFacade = inject(TrainingSessionFacade);
  private readonly router = inject(Router);

  protected readonly fullSessionLabel = FULL_SESSION_LABEL;
  protected readonly durationIcon = Timer;
  protected readonly heroIconSize = AXIS_ICON_SIZE.hero;
  protected readonly cardIconSize = AXIS_ICON_SIZE.card;

  protected readonly starting = signal(false);

  protected readonly sector =
    this.authFacade.currentUser()?.currentSector ?? Sector.RAILWAY;
  protected readonly sectorLabel = SECTOR_PRESENTATION[this.sector].label;

  protected readonly courseAxes = FULL_SESSION_AXIS_ORDER;

  protected readonly exploredAxis = signal<RailwayPlayableAxis>(
    FULL_SESSION_AXIS_ORDER[0],
  );

  protected readonly panelDirection = signal<'forward' | 'backward' | null>(
    null,
  );

  protected readonly exploredKeys = computed(() => [this.exploredAxis()]);

  protected readonly panelLeaveClass = computed(() =>
    this.panelDirection() === 'backward'
      ? 'simb__axis-panel--leave-right'
      : 'simb__axis-panel--leave-left',
  );

  protected readonly presentations = AXIS_PRESENTATION;
  protected readonly course = SIMULATION_COURSE;

  protected readonly axisCount = FULL_SESSION_AXIS_ORDER.length;
  protected readonly energyCost = SESSION_ENERGY_COST[SessionMode.FULL];
  protected readonly estimatedDuration = ESTIMATED_DURATION_LABEL;

  protected readonly howItGoes: readonly string[] = [
    "Les axes s'enchaînent dans l'ordre, avec une courte pause avant chacun.",
    'Chaque axe est chronométré séparément et ne se rejoue pas.',
    "En cas d'imprévu, quittez : vous reprendrez au début de l'axe en cours.",
  ];

  protected readonly adviceItems: AdviceItem[] = [
    {
      icon: VolumeX,
      text: "Installez-vous au calme, à l'abri des distractions.",
    },
    { icon: Clock, text: 'Prévoyez environ 25 minutes sans interruption.' },
    { icon: BellOff, text: 'Coupez vos notifications pour rester concentré.' },
  ];

  protected readonly emailUnverified = computed(
    () => this.authFacade.currentUser()?.emailVerifiedAt === null,
  );

  protected readonly energyShort = computed(
    () => this.energyFacade.state()?.canStartFull === false,
  );

  protected readonly balance = computed(
    () => this.energyFacade.state()?.balance ?? 0,
  );

  protected asCourseAxis(axis: RailwayPlayableAxis): RailwayPlayableAxis {
    return axis;
  }

  protected onAxisExplored(axis: AxisType): void {
    const next = axis as RailwayPlayableAxis;
    const previous = this.exploredAxis();
    if (next === previous) {
      return;
    }
    this.panelDirection.set(
      FULL_SESSION_AXIS_ORDER.indexOf(next) >
        FULL_SESSION_AXIS_ORDER.indexOf(previous)
        ? 'forward'
        : 'backward',
    );
    this.exploredAxis.set(next);
  }

  protected start(): void {
    if (this.starting() || this.emailUnverified() || this.energyShort()) {
      return;
    }
    this.starting.set(true);
    this.trainingSessionFacade
      .startFull()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) =>
          this.router.navigate([
            '/entrainements/examen-blanc/session',
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
