import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Lightbulb, X } from 'lucide-angular';
import { Icon } from '../../../shared/ui/icon/icon';

@Component({
  selector: 'ui-rule-hint',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './rule-hint.html',
  styleUrl: './rule-hint.css',
  host: { '(document:click)': 'onDocumentClick($event)' },
})
export class RuleHint {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly hint = input.required<string>();
  readonly used = input(false);
  readonly popWidth = input(316);
  readonly opened = output<void>();

  protected readonly bulbIcon = Lightbulb;
  protected readonly closeIcon = X;

  private readonly bulb = viewChild<ElementRef<HTMLButtonElement>>('bulb');
  private readonly open = signal(false);
  readonly hintOpen = this.open.asReadonly();

  toggle(): void {
    const opening = !this.open();
    this.open.set(opening);
    if (opening) {
      this.opened.emit();
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
    if (
      this.open() &&
      !this.elementRef.nativeElement.contains(event.target as Node)
    ) {
      this.close();
    }
  }
}
