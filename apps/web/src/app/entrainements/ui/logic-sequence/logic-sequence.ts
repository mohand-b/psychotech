import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  viewChild,
} from '@angular/core';
import { RuleHint } from '../rule-hint/rule-hint';

@Component({
  selector: 'ui-logic-sequence',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RuleHint],
  templateUrl: './logic-sequence.html',
  styleUrl: './logic-sequence.css',
})
export class LogicSequence {
  readonly terms = input.required<string[]>();
  readonly filledValue = input<string | null>(null);
  readonly hint = input<string | null>(null);
  readonly hintUsed = input(false);
  readonly hintOpened = output<void>();

  private readonly ruleHint = viewChild<RuleHint>('ruleHint');

  hintOpen(): boolean {
    return this.ruleHint()?.hintOpen() ?? false;
  }

  toggle(): void {
    this.ruleHint()?.toggle();
  }

  close(returnFocus = false): void {
    this.ruleHint()?.close(returnFocus);
  }
}
