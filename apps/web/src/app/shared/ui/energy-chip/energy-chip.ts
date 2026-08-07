import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { EnergyStateDto } from '@psychotech/shared';
import { AxisIcon } from '../axis-icon/axis-icon';

@Component({
  selector: 'ui-energy-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisIcon],
  template: `
    <span
      class="chip"
      [class.chip--depleted]="depleted() && !short()"
      [class.chip--short]="short()"
    >
      <ui-axis-icon class="chip__bolt" axis="credit" [size]="14" />
      <span class="chip__value">{{ balance() }}</span>
    </span>
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
    .chip__value {
      font: 600 13px/1 var(--font-mono);
      font-variant-numeric: tabular-nums;
      color: var(--brand-hover);
    }
    .chip--depleted {
      background: var(--bg);
    }
    .chip--depleted .chip__value {
      color: var(--label);
    }
    .chip--short {
      background: var(--danger-pastel);
      border: 1px solid color-mix(in srgb, var(--danger-text) 30%, var(--card));
      padding: 6px 11px;
    }
    .chip--short .chip__value {
      color: var(--danger-text);
    }
    @media (max-width: 767px) {
      .chip {
        gap: 6px;
        border-radius: 8px;
        padding: 6px 10px;
      }
      .chip__value {
        font-size: 12.5px;
      }
    }
  `,
})
export class EnergyChip {
  readonly state = input<EnergyStateDto | null>(null);
  readonly requiredCost = input<number | null>(null);

  protected readonly balance = computed(() => this.state()?.balance ?? 0);
  protected readonly depleted = computed(() => this.balance() === 0);
  protected readonly short = computed(() => {
    const cost = this.requiredCost();
    return (
      cost !== null && this.state() !== null && this.balance() < cost
    );
  });
}
