import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { EnergyStateDto, SubscriptionTier } from '@psychotech/shared';
import { BoltIcon } from '../bolt-icon/bolt-icon';

const ENERGY_CAPACITY = 5;

@Component({
  selector: 'ui-energy-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BoltIcon],
  template: `
    @if (unlimited()) {
      <span class="chip" [class.chip--compact]="compact()">
        <ui-bolt class="chip__bolt" [size]="compact() ? 13 : 14" />
        <span class="chip__label">Illimité</span>
      </span>
    } @else {
      <span
        class="chip"
        [class.chip--compact]="compact()"
        [class.chip--depleted]="depleted()"
      >
        <ui-bolt class="chip__bolt" [size]="compact() ? 13 : 14" />
        <span class="chip__value"
          >{{ balance() }}<span class="chip__max">/{{ capacity }}</span></span
        >
      </span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: var(--brand-pastel);
      border-radius: 9px;
      padding: 7px 12px;
    }
    .chip__bolt {
      color: var(--brand);
    }
    .chip__value {
      font: 600 13px/1 var(--font-mono);
      font-variant-numeric: tabular-nums;
      color: var(--brand-hover);
    }
    .chip__max {
      font-size: 10.5px;
      font-weight: 500;
      opacity: 0.6;
    }
    .chip__label {
      font: 600 12px/1 var(--font-ui);
      letter-spacing: 0.02em;
      color: var(--brand);
    }
    .chip--compact {
      padding: 6px 10px;
    }
    .chip--compact .chip__value {
      font-size: 12.5px;
    }
    .chip--compact .chip__max {
      font-size: 10px;
    }
    .chip--depleted {
      background: var(--bg);
    }
    .chip--depleted .chip__bolt {
      color: var(--border-hover);
    }
    .chip--depleted .chip__value {
      color: var(--label);
    }
    .chip--depleted .chip__max {
      opacity: 0.7;
    }
  `,
})
export class EnergyChip {
  readonly state = input<EnergyStateDto | null>(null);
  readonly compact = input(false);

  protected readonly capacity = ENERGY_CAPACITY;

  protected readonly unlimited = computed(
    () => this.state()?.tier === SubscriptionTier.UNLIMITED,
  );
  protected readonly balance = computed(() => this.state()?.balance ?? 0);
  protected readonly depleted = computed(() => this.balance() === 0);
}
