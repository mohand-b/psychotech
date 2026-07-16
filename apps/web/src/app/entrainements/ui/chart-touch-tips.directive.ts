import { Directive, ElementRef, inject } from '@angular/core';

const OPEN_CLASS = 'tip-open';

@Directive({
  selector: '[uiChartTouchTips]',
  host: {
    '(click)': 'onClick($event)',
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class ChartTouchTips {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  protected onClick(event: Event): void {
    const slot = (event.target as HTMLElement).closest('[data-tip-slot]');
    if (!slot || !this.elementRef.nativeElement.contains(slot)) {
      return;
    }
    const wasOpen = slot.classList.contains(OPEN_CLASS);
    this.closeAll();
    if (!wasOpen) {
      slot.classList.add(OPEN_CLASS);
    }
  }

  protected onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeAll();
    }
  }

  private closeAll(): void {
    const open = this.elementRef.nativeElement.querySelectorAll(
      `.${OPEN_CLASS}`,
    );
    for (const slot of open) {
      slot.classList.remove(OPEN_CLASS);
    }
  }
}
