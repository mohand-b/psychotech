import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { EnergyFacade } from '../../data-access/energy.facade';
import { BoltIcon } from '../../../shared/ui/bolt-icon/bolt-icon';

@Component({
  selector: 'app-energie',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BoltIcon],
  templateUrl: './energie.html',
  styleUrl: './energie.css',
})
export class Energie {
  private readonly energyFacade = inject(EnergyFacade);

  protected readonly balance = computed(
    () => this.energyFacade.state()?.balance ?? 0,
  );
}
