import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';
import { LucideIconData } from 'lucide-angular';
import { Icon } from '../icon/icon';

export type KeycapVariant = 'key' | 'button';

@Component({
  selector: 'ui-keycap',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    @if (icon(); as glyph) {
      <ui-icon [img]="glyph" [size]="13" />
    } @else {
      {{ label() }}
    }
  `,
  host: {
    '[class.ui-keycap--key]': "variant() === 'key'",
    '[class.ui-keycap--button]': "variant() === 'button'",
    '[class.ui-keycap--icon]': 'icon() !== null',
  },
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--card);
      border: 1px solid var(--keycap-bd);
      border-bottom-width: 3px;
      color: var(--ink);
    }
    :host(.ui-keycap--key) {
      min-width: 26px;
      height: 26px;
      padding: 0 8px;
      border-radius: 7px;
      font: 600 12px/1 var(--font-mono);
      font-variant-numeric: tabular-nums;
    }
    :host(.ui-keycap--key.ui-keycap--icon) {
      padding: 0 6px;
    }
    :host(.ui-keycap--button) {
      min-height: 24px;
      padding: 2px 9px;
      border-radius: 8px;
      font: 600 11px/1.25 var(--font-ui);
      text-align: center;
    }
    @media (max-width: 767px) {
      :host(.ui-keycap--key) {
        min-width: 24px;
        height: 24px;
        padding: 0 7px;
        font-size: 11px;
      }
    }
  `,
})
export class Keycap {
  readonly label = input<string | null>(null);
  readonly icon = input<LucideIconData | null>(null);
  readonly variant = input<KeycapVariant>('key');
}
