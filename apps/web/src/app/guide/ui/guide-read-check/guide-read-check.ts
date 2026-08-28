import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { AxisIcon } from '../../../shared/ui/axis-icon/axis-icon';

@Component({
  selector: 'app-guide-read-check',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisIcon],
  templateUrl: './guide-read-check.html',
  styleUrl: './guide-read-check.css',
})
export class GuideReadCheck {
  readonly marked = input.required<boolean>();
  readonly mark = output<void>();

  protected activate(event?: Event): void {
    event?.preventDefault();
    if (!this.marked()) {
      this.mark.emit();
    }
  }
}
