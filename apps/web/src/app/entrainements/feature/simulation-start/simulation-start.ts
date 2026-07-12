import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { FULL_SESSION_AXIS_ORDER, Sector } from '@psychotech/shared';
import {
  BellOff,
  Clock,
  Layers,
  LayoutGrid,
  LucideIconData,
  VolumeX,
} from 'lucide-angular';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { BoltIcon } from '../../../shared/ui/bolt-icon/bolt-icon';
import { Button } from '../../../shared/ui/button/button';
import { SectorChip } from '../../../shared/ui/sector-chip/sector-chip';
import {
  ChevronStep,
  ChevronStepper,
} from '../../../shared/ui/chevron-stepper/chevron-stepper';
import { Icon } from '../../../shared/ui/icon/icon';

const FULL_SESSION_ENERGY_COST = 5;
const ESTIMATED_DURATION_LABEL = '~25 min';

interface AdviceItem {
  icon: LucideIconData;
  text: string;
}

@Component({
  selector: 'app-simulation-start',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BoltIcon, Button, ChevronStepper, Icon, SectorChip],
  templateUrl: './simulation-start.html',
  styleUrl: './simulation-start.css',
})
export class SimulationStart {
  private readonly authFacade = inject(AuthFacade);
  private readonly trainingSessionFacade = inject(TrainingSessionFacade);
  private readonly router = inject(Router);

  protected readonly heroIcon = Layers;
  protected readonly axesIcon = LayoutGrid;
  protected readonly durationIcon = Clock;

  protected readonly starting = signal(false);

  protected readonly sector =
    this.authFacade.currentUser()?.currentSector ?? Sector.RAILWAY;

  protected readonly steps: ChevronStep[] = FULL_SESSION_AXIS_ORDER.map(
    (axis) => ({ axis, state: 'plain' }),
  );

  protected readonly axisCount = FULL_SESSION_AXIS_ORDER.length;
  protected readonly energyCost = FULL_SESSION_ENERGY_COST;
  protected readonly estimatedDuration = ESTIMATED_DURATION_LABEL;

  protected readonly adviceItems: AdviceItem[] = [
    {
      icon: VolumeX,
      text: "Installez-vous au calme, à l'abri des distractions.",
    },
    { icon: Clock, text: 'Prévoyez environ 25 minutes sans interruption.' },
    { icon: BellOff, text: 'Coupez vos notifications pour rester concentré.' },
  ];

  protected start(): void {
    if (this.starting()) {
      return;
    }
    this.starting.set(true);
    this.trainingSessionFacade.startFull().subscribe({
      next: (session) =>
        this.router.navigate([
          '/entrainements/simulation/session',
          session.id,
        ]),
      error: () => this.starting.set(false),
    });
  }
}
