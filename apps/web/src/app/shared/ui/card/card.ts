import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ui-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-card__body">
      @if (sectionLabel()) {
        <div class="ui-card__header">
          <span class="t-label">{{ sectionLabel() }}</span>
          <ng-content select="[card-action]" />
        </div>
      }
      <ng-content />
      @if (footer()) {
        <div class="hairline"></div>
        <ng-content select="[card-footer]" />
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      box-shadow: var(--shadow-card);
      padding: var(--ui-card-padding);
    }
    .ui-card__body {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .ui-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  `,
  host: {
    '[style.--ui-card-padding.px]': 'padding()',
  },
})
export class Card {
  readonly sectionLabel = input('');
  readonly footer = input(false);
  readonly padding = input(24);
}
