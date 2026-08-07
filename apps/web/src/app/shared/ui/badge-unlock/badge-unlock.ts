import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { BadgeId } from '@psychotech/shared';
import { BoltIcon } from '../bolt-icon/bolt-icon';

export interface BadgeRevealView {
  badgeId: BadgeId;
  name: string;
  assetPath: string;
  gain: number | null;
}

@Component({
  selector: 'ui-badge-unlock',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BoltIcon],
  template: `
    <section class="unlock">
      <span class="t-label">{{ title() }}</span>
      <div class="unlock__rows">
        @for (badge of badges(); track badge.badgeId) {
          <div class="unlock__row">
            <img class="unlock__art" [src]="badge.assetPath" [alt]="badge.name" />
            <span class="unlock__name">{{ badge.name }}</span>
            @if (badge.gain) {
              <span class="unlock__gain t-mono"
                >+{{ badge.gain }}<ui-bolt [size]="12" [filled]="true"
              /></span>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .unlock {
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-panel);
      box-shadow: var(--shadow-card);
      padding: 18px 24px;
    }
    .unlock__rows {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .unlock__row {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .unlock__art {
      width: 52px;
      height: 52px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .unlock__name {
      font: 600 15px/1.4 var(--font-ui);
      color: var(--ink);
    }
    .unlock__gain {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 13px;
      font-weight: 600;
      color: var(--brand-hover);
    }
  `,
})
export class BadgeUnlock {
  readonly badges = input.required<BadgeRevealView[]>();

  protected readonly title = computed(() =>
    this.badges().length > 1 ? 'Badges débloqués' : 'Badge débloqué',
  );
}
