import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowLeft } from 'lucide-angular';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { EnergyGauge } from '../energy-gauge/energy-gauge';
import { Icon } from '../icon/icon';

@Component({
  selector: 'ui-focused-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, EnergyGauge],
  template: `
    <header class="focused-header">
      <div class="focused-header__inner">
        <nav class="focused-header__crumb" aria-label="Fil d'Ariane">
          <a class="focused-header__back" [routerLink]="backLink()">
            <ui-icon [img]="backIcon" [size]="16" />
            <span>{{ backLabel() }}</span>
          </a>
          <span class="focused-header__separator"></span>
          <span class="focused-header__title">{{ title() }}</span>
        </nav>
        <ui-energy-gauge [state]="energy()" />
      </div>
    </header>
  `,
  styleUrl: './focused-header.css',
})
export class FocusedHeader {
  private readonly energyFacade = inject(EnergyFacade);

  readonly title = input.required<string>();
  readonly backLabel = input.required<string>();
  readonly backLink = input.required<string>();

  protected readonly backIcon = ArrowLeft;
  protected readonly energy = this.energyFacade.state;
}
