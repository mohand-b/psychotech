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
  SESSION_MODE_LABELS,
  SessionMode,
} from '@psychotech/shared';
import { Play, RotateCcw } from 'lucide-angular';
import { AxisLabel } from '../../../shared/ui/axis-label/axis-label';
import { Button } from '../../../shared/ui/button/button';
import {
  ChevronStep,
  ChevronStepper,
  StepState,
} from '../../../shared/ui/chevron-stepper/chevron-stepper';

const STEP_STATES: Record<AxisProgressStatus, StepState> = {
  [AxisProgressStatus.DONE]: 'done',
  [AxisProgressStatus.CURRENT]: 'current',
  [AxisProgressStatus.PENDING]: 'todo',
};

@Component({
  selector: 'app-current-session-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisLabel, Button, ChevronStepper],
  templateUrl: './current-session-banner.html',
  styleUrl: './current-session-banner.css',
})
export class CurrentSessionBanner {
  readonly session = input.required<CurrentSessionDto>();
  readonly resumeRequested = output<void>();

  protected readonly isFull = computed(
    () => this.session().mode === SessionMode.FULL,
  );

  protected readonly modeLabel = computed(
    () => SESSION_MODE_LABELS[this.session().mode],
  );

  protected readonly targetedAxis = computed(
    () => this.session().axes[0]?.axis ?? null,
  );

  protected readonly ctaLabel = computed(() =>
    this.isFull() ? 'Reprendre' : 'Recommencer',
  );

  protected readonly ctaIcon = computed(() =>
    this.isFull() ? Play : RotateCcw,
  );


  protected readonly steps = computed<ChevronStep[]>(() =>
    this.session().axes.map(({ axis, status }) => ({
      axis,
      state: STEP_STATES[status],
    })),
  );
}
