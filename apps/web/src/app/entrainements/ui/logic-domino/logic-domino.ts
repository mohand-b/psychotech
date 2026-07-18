import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  viewChild,
} from '@angular/core';
import { DominoFace, DominoTile } from '@psychotech/shared';
import { ArrowRight, Delete } from 'lucide-angular';
import { Icon } from '../../../shared/ui/icon/icon';
import { DominoPips } from '../domino-pips/domino-pips';
import { RuleHint } from '../rule-hint/rule-hint';

export type DominoAnswerFace = 'top' | 'bottom';

export const DOMINO_FACES: readonly DominoFace[] = [0, 1, 2, 3, 4, 5, 6];

@Component({
  selector: 'ui-logic-domino',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DominoPips, Icon, RuleHint],
  templateUrl: './logic-domino.html',
  styleUrl: './logic-domino.css',
})
export class LogicDomino {
  readonly tiles = input.required<readonly DominoTile[]>();
  readonly top = input.required<DominoFace | null>();
  readonly bottom = input.required<DominoFace | null>();
  readonly activeFace = input.required<DominoAnswerFace>();
  readonly disabled = input(false);
  readonly hint = input<string | null>(null);
  readonly hintUsed = input(false);
  readonly faceSelected = output<DominoAnswerFace>();
  readonly digitEntered = output<DominoFace>();
  readonly cleared = output<void>();
  readonly hintOpened = output<void>();

  protected readonly chevronIcon = ArrowRight;
  protected readonly eraseIcon = Delete;
  protected readonly digits = DOMINO_FACES;

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

  protected pickFace(face: DominoAnswerFace): void {
    if (!this.disabled()) {
      this.faceSelected.emit(face);
    }
  }

  protected pressDigit(digit: DominoFace): void {
    if (!this.disabled()) {
      this.digitEntered.emit(digit);
    }
  }

  protected clear(): void {
    if (!this.disabled()) {
      this.cleared.emit();
    }
  }
}
