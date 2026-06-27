import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { EnergyFacade } from '../../energy/data-access/energy.facade';
import { Navbar } from '../../shared/ui/navbar/navbar';

@Component({
  selector: 'app-connected-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Navbar],
  templateUrl: './connected-layout.html',
  styleUrl: './connected-layout.css',
})
export class ConnectedLayout {
  private readonly energyFacade = inject(EnergyFacade);

  constructor() {
    this.energyFacade
      .load()
      .pipe(takeUntilDestroyed())
      .subscribe({ error: () => undefined });
  }
}
