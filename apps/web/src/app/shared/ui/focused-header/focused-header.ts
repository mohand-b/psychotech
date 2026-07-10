import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AxisType } from '@psychotech/shared';
import { ArrowLeft, CircleQuestionMark, Timer, X } from 'lucide-angular';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { AxisChip } from '../axis-chip/axis-chip';
import { EnergyGauge } from '../energy-gauge/energy-gauge';
import { Icon } from '../icon/icon';

export type TimerSeverity = 'normal' | 'warning' | 'danger' | 'inactive';

@Component({
  selector: 'ui-focused-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, EnergyGauge, AxisChip],
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
          @if (axisChip(); as chip) {
            <ui-axis-chip [axis]="chip" />
          }
        </nav>

        <div class="focused-header__actions">
          @if (showEnergy()) {
            <ui-energy-gauge [state]="energy()" />
            @if (duration() || closeLink()) {
              <span class="focused-header__separator"></span>
            }
          }
          @if (duration(); as duration) {
            <span
              class="focused-header__timer"
              [class.focused-header__timer--warning]="timerSeverity() === 'warning'"
              [class.focused-header__timer--danger]="timerSeverity() === 'danger'"
              [class.focused-header__timer--inactive]="timerSeverity() === 'inactive'"
            >
              <ui-icon [img]="timerIcon" [size]="15" />
              <span class="focused-header__timer-value">{{ duration }}</span>
            </span>
          }
          @if (helpText(); as helpText) {
            <button
              type="button"
              class="focused-header__icon-button focused-header__help"
              [title]="helpText"
              aria-label="Aide"
            >
              <ui-icon [img]="helpIcon" [size]="17" />
            </button>
          }
          @if (closeLink()) {
            <button
              type="button"
              class="focused-header__icon-button"
              aria-label="Fermer la session"
              (click)="closeRequested.emit()"
            >
              <ui-icon [img]="closeIcon" [size]="18" />
            </button>
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
  readonly axisChip = input<AxisType | null>(null);
  readonly duration = input<string | null>(null);
  readonly timerSeverity = input<TimerSeverity>('normal');
  readonly showEnergy = input(true);
  readonly helpText = input<string | null>(null);
  readonly closeLink = input<string | null>(null);
  readonly closeRequested = output<void>();

  protected readonly backIcon = ArrowLeft;
  protected readonly timerIcon = Timer;
  protected readonly helpIcon = CircleQuestionMark;
  protected readonly closeIcon = X;
  protected readonly energy = this.energyFacade.state;
}
