import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Lightbulb, MoveRight, X } from 'lucide-angular';
import { Icon } from '../../../shared/ui/icon/icon';

@Component({
  selector: 'ui-logic-sequence',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './logic-sequence.html',
  styleUrl: './logic-sequence.css',
  host: { '(document:click)': 'onDocumentClick($event)' },
})
export class LogicSequence {
  readonly terms = input.required<string[]>();
  readonly hint = input<string | null>(null);
  readonly hintUsed = input(false);
  readonly hintOpened = output<void>();

  protected readonly arrowIcon = MoveRight;
  protected readonly bulbIcon = Lightbulb;
  protected readonly closeIcon = X;

  private readonly anchor = viewChild<ElementRef<HTMLElement>>('anchor');
  private readonly bulb = viewChild<ElementRef<HTMLButtonElement>>('bulb');
  private readonly open = signal(false);
  readonly hintOpen = this.open.asReadonly();

  toggle(): void {
    if (this.hint() === null) {
      return;
    }
    const opening = !this.open();
    this.open.set(opening);
    if (opening) {
      this.hintOpened.emit();
    }
  }

  close(returnFocus = false): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    if (returnFocus) {
      this.bulb()?.nativeElement.focus();
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) {
      return;
    }
    const anchor = this.anchor()?.nativeElement;
    if (anchor && !anchor.contains(event.target as Node)) {
      this.close();
    }
  }
}
