import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';
import { BoltIcon } from '../../shared/ui/bolt-icon/bolt-icon';
import { BadgeArt } from './badge-art';
import { BadgeConditions } from './badge-conditions';
import { TransverseBadgeView } from './badge-views';

@Component({
  selector: 'ui-badge-transverse-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeArt, BadgeConditions, BoltIcon],
  template: `
    @if (badge(); as view) {
      <ui-badge-art
        class="trans-row__art"
        [src]="view.assetPath"
        [alt]="view.name ?? 'Badge à débloquer'"
        [locked]="view.locked"
      />
      <div class="trans-row__text">
        <span class="trans-row__name-line">
          @if (view.name) {
            <span class="trans-row__name">{{ view.name }}</span>
          } @else {
            <span class="trans-row__name trans-row__name--locked"
              >Badge à débloquer</span
            >
          }
          @if (view.gain) {
            <span class="trans-row__gain t-mono"
              >+{{ view.gain }}<ui-bolt [size]="10" [filled]="true"
            /></span>
          }
        </span>
        @if (view.earnedLine) {
          <span class="trans-row__date">{{ view.earnedLine }}</span>
        }
        @if (view.conditionLine) {
          <span class="trans-row__cond">{{ view.conditionLine }}</span>
        }
        @if (view.conditions) {
          <ui-badge-conditions
            [intro]="view.conditionsIntro"
            [conditions]="view.conditions"
          />
        }
        @if (view.rarityLabel) {
          <span class="trans-row__rarity">{{ view.rarityLabel }}</span>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .trans-row__art {
      --badge-art-size: 76px;
    }
    .trans-row__text {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }
    .trans-row__name-line {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
    }
    .trans-row__name {
      font: 600 15px/1.4 var(--font-ui);
      color: var(--ink);
    }
    .trans-row__name--locked {
      color: var(--label);
    }
    .trans-row__gain {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 11px;
      font-weight: 600;
      color: var(--brand-hover);
    }
    .trans-row__date {
      font: 600 12px/1.4 var(--font-ui);
      color: var(--success-text);
    }
    .trans-row__cond {
      font: 400 12px/1.5 var(--font-ui);
      color: var(--text-secondary);
    }
    .trans-row__rarity {
      font: 400 10.5px/1.4 var(--font-ui);
      color: var(--text-disabled);
    }
    @media (max-width: 767px) {
      :host {
        align-items: center;
        gap: 14px;
        padding: 13px 16px;
      }
      :host(:not(:first-child)) {
        border-top: 1px solid var(--divider-soft);
      }
      .trans-row__art {
        --badge-art-size: 62px;
      }
      .trans-row__name {
        font-size: 14px;
      }
      .trans-row__date {
        font-size: 11.5px;
      }
      .trans-row__cond {
        font-size: 12px;
        color: var(--label);
      }
    }
  `,
})
export class BadgeTransverseRow {
  readonly badge = input.required<TransverseBadgeView>();
}
