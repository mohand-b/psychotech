import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { EnergyStateDto, SubscriptionTier } from '@psychotech/shared';
import { Zap } from 'lucide-angular';
import { Icon } from '../icon/icon';

@Component({
  selector: 'ui-energy-gauge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './energy-gauge.html',
  styleUrl: './energy-gauge.css',
})
export class EnergyGauge {
  readonly state = input<EnergyStateDto | null>(null);
  readonly compact = input(false);

  protected readonly zapIcon = Zap;

  protected readonly unlimited = computed(
    () => this.state()?.tier === SubscriptionTier.UNLIMITED,
  );
  protected readonly balance = computed(() => this.state()?.balance ?? 0);
  protected readonly depleted = computed(() => this.balance() === 0);
  protected readonly segments = computed(() =>
    Array.from({ length: this.state()?.capacity ?? 0 }, (_, index) => ({
      index,
      filled: index < this.balance(),
    })),
  );
}
