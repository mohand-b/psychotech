import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import { MatrixLogicItem } from '@psychotech/shared';
import { MatrixCell } from '../../../shared/ui/matrix/matrix-cell';
import { RuleHint } from '../rule-hint/rule-hint';

export const MATRIX_PROPOSAL_LETTERS: readonly string[] = ['A', 'B', 'C', 'D'];

@Component({
  selector: 'ui-logic-matrix',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatrixCell, RuleHint],
  templateUrl: './logic-matrix.html',
  styleUrl: './logic-matrix.css',
})
export class LogicMatrix {
  readonly item = input.required<MatrixLogicItem>();
  readonly selectedIndex = input<number | null>(null);
  readonly disabled = input(false);
  readonly hint = input<string | null>(null);
  readonly hintUsed = input(false);
  readonly chosen = output<number>();
  readonly hintOpened = output<void>();

  protected readonly letters = MATRIX_PROPOSAL_LETTERS;

  protected readonly visibleCells = computed(() =>
    this.item().matrix.cells.slice(0, 8),
  );

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

  protected choose(index: number): void {
    if (!this.disabled()) {
      this.chosen.emit(index);
    }
  }
}
