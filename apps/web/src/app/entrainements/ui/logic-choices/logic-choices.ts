import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { Check, X } from 'lucide-angular';
import { Icon } from '../../../shared/ui/icon/icon';

@Component({
  selector: 'ui-logic-choices',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './logic-choices.html',
  styleUrl: './logic-choices.css',
})
export class LogicChoices {
  readonly choices = input.required<string[]>();
  readonly selectedIndex = input<number | null>(null);
  readonly review = input(false);
  readonly correctIndex = input<number | null>(null);
  readonly userAnswerIndex = input<number | null>(null);
  readonly disabled = input(false);
  readonly chosen = output<number>();

  protected readonly letters = ['A', 'B', 'C', 'D'];
  protected readonly checkIcon = Check;
  protected readonly crossIcon = X;

  protected isCorrect(index: number): boolean {
    return this.review() && this.correctIndex() === index;
  }

  protected isUserWrong(index: number): boolean {
    return (
      this.review() &&
      this.userAnswerIndex() === index &&
      this.correctIndex() !== index
    );
  }

  protected onChoose(index: number): void {
    if (!this.review() && !this.disabled()) {
      this.chosen.emit(index);
    }
  }
}
