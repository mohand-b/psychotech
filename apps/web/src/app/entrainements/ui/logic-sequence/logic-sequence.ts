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
  readonly filledTone = input<'neutral' | 'correct'>('neutral');
  readonly hint = input<string | null>(null);
  readonly hintUsed = input(false);
  readonly hintOpened = output<void>();

  private readonly ruleHint = viewChild<RuleHint>('ruleHint');

  isHintOpen(): boolean {
    return this.ruleHint()?.hintOpen() ?? false;
  }

  toggleHint(): void {
    this.ruleHint()?.toggleHint();
  }

  closeHint(returnFocus = false): void {
    this.ruleHint()?.closeHint(returnFocus);
  }
}
