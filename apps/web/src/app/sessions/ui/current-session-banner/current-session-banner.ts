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
import { Play } from 'lucide-angular';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
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
  imports: [Button, ChevronStepper],
  templateUrl: './current-session-banner.html',
  styleUrl: './current-session-banner.css',
})
export class CurrentSessionBanner {
  readonly session = input.required<CurrentSessionDto>();
  readonly resumeRequested = output<void>();

  protected readonly playIcon = Play;

  protected readonly modeLabel = computed(() =>
    this.session().mode === SessionMode.FULL
      ? 'Simulation complète'
      : 'Entraînement ciblé',
  );

  protected readonly modeShortLabel = computed(() =>
    this.session().mode === SessionMode.FULL ? 'Simulation' : 'Ciblé',
  );

  protected readonly resumeMention = computed(() =>
    this.session().mode === SessionMode.FULL
      ? "Reprend au début de l'axe en cours"
      : "L'épreuve redémarre du début",
  );

  protected readonly sectorLabel = computed(
    () => SECTOR_PRESENTATION[this.session().sector].label,
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
