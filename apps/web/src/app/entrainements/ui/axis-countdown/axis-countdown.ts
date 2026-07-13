import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { AxisType } from '@psychotech/shared';
import { ArrowRight } from 'lucide-angular';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { Icon } from '../../../shared/ui/icon/icon';

export const AXIS_COUNTDOWN_START = 3;
export const AXIS_COUNTDOWN_TICK_MS = 1000;

@Component({
  selector: 'ui-axis-countdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div
      class="countdown"
      role="status"
      aria-label="Décompte avant le début de l'épreuve"
      [style.--axis-plain]="presentation().plainVar"
      [style.--axis-pastel]="presentation().pastelVar"
      [style.--axis-pastel-bd]="presentation().pastelBorderVar"
      [style.--axis-text]="presentation().textVar"
    >
      <span class="countdown__chip">
        <ui-icon [img]="presentation().icon" [size]="14" />
        <span>{{ presentation().label }}</span>
      </span>

      <div class="countdown__stage">
        @for (tick of ringKey(); track tick) {
          <svg class="countdown__ring" viewBox="0 0 120 120" aria-hidden="true">
            <circle class="countdown__ring-track" cx="60" cy="60" r="54" />
            <circle class="countdown__ring-progress" cx="60" cy="60" r="54" />
          </svg>
        }
        <span class="countdown__digit">{{ value() }}</span>
      </div>

      <p class="countdown__title">L'épreuve commence</p>
      <p class="countdown__mobile-hint">Préparez-vous, l'axe commence.</p>

      <button type="button" class="countdown__skip" (click)="skip()">
        <span class="countdown__skip-label--desktop">Passer le décompte</span>
        <span class="countdown__skip-label--mobile">Passer</span>
        <ui-icon class="countdown__skip-arrow" [img]="arrowIcon" [size]="15" />
      </button>
    </div>
  `,
  styleUrl: './axis-countdown.css',
})
export class AxisCountdown {
  private readonly destroyRef = inject(DestroyRef);

  readonly axis = input.required<AxisType>();
  readonly finished = output<void>();

  protected readonly arrowIcon = ArrowRight;
  protected readonly value = signal(AXIS_COUNTDOWN_START);
  protected readonly ringKey = computed(() => [this.value()]);

  protected readonly presentation = computed(
    () => AXIS_PRESENTATION[this.axis()],
  );

  private timerId: number | null = null;
  private done = false;

  constructor() {
    this.timerId = window.setInterval(() => {
      const next = this.value() - 1;
      if (next <= 0) {
        this.finish();
        return;
      }
      this.value.set(next);
    }, AXIS_COUNTDOWN_TICK_MS);
    this.destroyRef.onDestroy(() => this.clearTimer());
  }

  protected skip(): void {
    this.finish();
  }

  private finish(): void {
    if (this.done) {
      return;
    }
    this.done = true;
    this.clearTimer();
    this.finished.emit();
  }

  private clearTimer(): void {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
