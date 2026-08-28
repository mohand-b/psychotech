import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  viewChild,
} from '@angular/core';
import { TriangleItem } from '@psychotech/shared';
import { LogicChoices } from '../logic-choices/logic-choices';
import { TriangleSeries } from '../../../shared/ui/triangle/triangle-series';
import { RuleHint } from '../rule-hint/rule-hint';

@Component({
  selector: 'ui-logic-triangle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LogicChoices, RuleHint, TriangleSeries],
  templateUrl: './logic-triangle.html',
  styleUrl: './logic-triangle.css',
})
export class LogicTriangle {
  readonly item = input.required<TriangleItem>();
  readonly value = input.required<number | null>();
  readonly choices = input.required<string[]>();
  readonly selectedIndex = input<number | null>(null);
  readonly disabled = input(false);
  readonly hint = input<string | null>(null);
  readonly hintUsed = input(false);
  readonly chosen = output<number>();
  readonly hintOpened = output<void>();

  private readonly ruleHint = viewChild<RuleHint>('ruleHint');

  hintOpen(): boolean {
    return this.ruleHint()?.hintOpen() ?? false;
  }

  toggleHint(): void {
    this.ruleHint()?.toggle();
  }

  closeHint(returnFocus = false): void {
    this.ruleHint()?.close(returnFocus);
  }
}
