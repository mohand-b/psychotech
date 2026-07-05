import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowLeft, Timer, X } from 'lucide-angular';

export type TimerSeverity = 'normal' | 'warning' | 'danger';
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

        <div class="focused-header__actions">
          <ui-energy-gauge [state]="energy()" />
          @if (closeLink(); as closeLink) {
            <span class="focused-header__separator"></span>
            @if (duration(); as duration) {
              <span
                class="focused-header__timer"
                [class.focused-header__timer--warning]="timerSeverity() === 'warning'"
                [class.focused-header__timer--danger]="timerSeverity() === 'danger'"
              >
                <ui-icon [img]="timerIcon" [size]="15" />
                <span class="focused-header__timer-value">{{ duration }}</span>
              </span>
            }
            <a
              class="focused-header__close"
              [routerLink]="closeLink"
              aria-label="Fermer la session"
            >
              <ui-icon [img]="closeIcon" [size]="18" />
            </a>
          }
        </div>
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
  readonly duration = input<string | null>(null);
  readonly timerSeverity = input<TimerSeverity>('normal');
  readonly closeLink = input<string | null>(null);

  protected readonly backIcon = ArrowLeft;
  protected readonly timerIcon = Timer;
  protected readonly closeIcon = X;
  protected readonly energy = this.energyFacade.state;
}
