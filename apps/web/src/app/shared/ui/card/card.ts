import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ui-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-4">
      @if (sectionLabel()) {
        <div class="flex items-center justify-between gap-3">
          <span class="t-label">{{ sectionLabel() }}</span>
          <ng-content select="[ui-card-action]" />
        </div>
        <div class="hairline"></div>
      }
      <ng-content />
    </div>
  `,
  styles: `
    :host {
      display: block;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-card);
      box-shadow: var(--shadow-card);
      padding: var(--ui-card-padding);
    }
  `,
  host: {
    '[style.--ui-card-padding.px]': 'padding()',
  },
})
export class Card {
  readonly sectionLabel = input('');
  readonly padding = input(24);
}
