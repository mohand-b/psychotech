import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { AxisType } from '@psychotech/shared';
import { ArrowLeft, ArrowRight } from 'lucide-angular';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import {
  CorrectionStatusBand,
  StatusBandEntry,
} from '../correction-status-band/correction-status-band';

@Component({
  selector: 'ui-correction-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, CorrectionStatusBand],
  templateUrl: './correction-shell.html',
  styleUrl: './correction-shell.css',
})
export class CorrectionShell {
  readonly axis = input.required<AxisType>();
  readonly dots = input.required<StatusBandEntry[]>();
  readonly legend = input.required<StatusBandEntry[]>();
  readonly currentIndex = input.required<number>();
  readonly isFirst = input.required<boolean>();
  readonly isLast = input.required<boolean>();
  readonly navigate = output<number>();
  readonly previous = output<void>();
  readonly next = output<void>();
  readonly backToResult = output<void>();

  protected readonly backIcon = ArrowLeft;
  protected readonly forwardIcon = ArrowRight;

  protected readonly presentation = computed(
    () => AXIS_PRESENTATION[this.axis()],
  );
}
