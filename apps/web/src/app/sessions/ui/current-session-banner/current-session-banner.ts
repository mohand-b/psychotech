import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  AxisProgressStatus,
  CurrentSessionDto,
  SessionMode,
} from '@psychotech/shared';
import { Play, RotateCcw } from 'lucide-angular';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { AxisChip } from '../../../shared/ui/axis-chip/axis-chip';
import { Button } from '../../../shared/ui/button/button';
import {
  ChevronStep,
  ChevronStepper,
  StepState,
} from '../../../shared/ui/chevron-stepper/chevron-stepper';
import { SECTOR_PRESENTATION } from '../../../shared/ui/sector-presentation';

const STEP_STATES: Record<AxisProgressStatus, StepState> = {
  [AxisProgressStatus.DONE]: 'done',
  [AxisProgressStatus.CURRENT]: 'current',
  [AxisProgressStatus.PENDING]: 'todo',
};

interface BannerDot {
  colorVar: string | null;
  state: StepState;
}

@Component({
  selector: 'app-current-session-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisChip, Button, ChevronStepper],
  templateUrl: './current-session-banner.html',
  styleUrl: './current-session-banner.css',
})
export class CurrentSessionBanner {
  readonly session = input.required<CurrentSessionDto>();
  readonly resumeRequested = output<void>();

  protected readonly isFull = computed(
    () => this.session().mode === SessionMode.FULL,
  );

  protected readonly modeLabel = computed(() =>
    this.isFull() ? 'Simulation complète' : 'Entraînement ciblé',
  );

  protected readonly sectorLabel = computed(
    () => SECTOR_PRESENTATION[this.session().sector].label,
  );

  protected readonly targetedAxis = computed(
    () => this.session().axes[0]?.axis ?? null,
  );

  protected readonly targetedAxisLabel = computed(() => {
    const axis = this.targetedAxis();
    return axis ? AXIS_PRESENTATION[axis].label : '';
  });

  protected readonly targetedAxisColorVar = computed(() => {
    const axis = this.targetedAxis();
    return axis ? AXIS_PRESENTATION[axis].plainVar : null;
  });

  protected readonly ctaLabel = computed(() =>
    this.isFull() ? 'Reprendre' : 'Recommencer',
  );

  protected readonly ctaIcon = computed(() =>
    this.isFull() ? Play : RotateCcw,
  );

  protected readonly resumeMention = computed(() =>
    this.isFull()
      ? "Reprend au début de l'axe en cours"
      : 'Reprend depuis le début, mêmes exercices',
  );

  protected readonly doneCount = computed(
    () =>
      this.session().axes.filter(
        ({ status }) => status === AxisProgressStatus.DONE,
      ).length,
  );

  protected readonly axisTotal = computed(() => this.session().axes.length);

  protected readonly steps = computed<ChevronStep[]>(() =>
    this.session().axes.map(({ axis, status }) => ({
      axis,
      state: STEP_STATES[status],
    })),
  );

  protected readonly dots = computed<BannerDot[]>(() =>
    this.session().axes.map(({ axis, status }) => ({
      colorVar:
        status === AxisProgressStatus.PENDING
          ? null
          : AXIS_PRESENTATION[axis].plainVar,
      state: STEP_STATES[status],
    })),
  );
}
