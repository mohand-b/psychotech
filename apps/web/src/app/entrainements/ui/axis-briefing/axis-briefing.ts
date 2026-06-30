import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  AXIS_TRAINING,
  AxisTimerModel,
  AxisType,
  RailwayPlayableAxis,
} from '@psychotech/shared';
import { ListChecks, Timer } from 'lucide-angular';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { formatDuration } from '../../../shared/ui/format-duration';
import { Icon } from '../../../shared/ui/icon/icon';

@Component({
  selector: 'ui-axis-briefing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div
      class="axis-briefing"
      [style.--axis-plain]="presentation().plainVar"
      [style.--axis-pastel]="presentation().pastelVar"
    >
      <header class="axis-briefing__head">
        <span class="axis-briefing__tile">
          <ui-icon [img]="presentation().icon" [size]="32" />
        </span>
        <h1 class="axis-briefing__name">{{ presentation().label }}</h1>
      </header>

      <article class="axis-briefing__card">
        <section class="axis-briefing__section">
          <span class="axis-briefing__label">Consigne</span>
          <p class="axis-briefing__text">{{ training().briefing.consigne }}</p>
        </section>

        <div class="hairline"></div>

        <section class="axis-briefing__section">
          <span class="axis-briefing__label">Objectif</span>
          <p class="axis-briefing__text">{{ training().briefing.objectif }}</p>
        </section>

        <div class="hairline"></div>

        <section class="axis-briefing__section">
          <span class="axis-briefing__label">Exemple</span>
        </section>

        <div class="hairline"></div>

        <section class="axis-briefing__summary">
          <span class="axis-briefing__label">Résumé</span>
          <div class="axis-briefing__summary-row">
            @if (training().exerciseCount; as exerciseCount) {
              <span class="axis-briefing__metric">
                <ui-icon [img]="itemsIcon" [size]="15" />
                <span class="axis-briefing__metric-value">{{ exerciseCount }}</span>
                items
              </span>
            }
            @if (duration(); as duration) {
              <span class="axis-briefing__metric">
                <ui-icon [img]="durationIcon" [size]="15" />
                <span class="axis-briefing__metric-value">{{ duration }}</span>
              </span>
            }
            @if (admissibilityThreshold(); as threshold) {
              <span class="axis-briefing__metric">
                <span class="axis-briefing__metric-value">{{ threshold }}</span>
                seuil d'admission
              </span>
            }
          </div>
        </section>
      </article>
    </div>
  `,
  styleUrl: './axis-briefing.css',
})
export class AxisBriefing {
  readonly axis = input.required<AxisType>();
  readonly admissibilityThreshold = input<number | null>(null);

  protected readonly itemsIcon = ListChecks;
  protected readonly durationIcon = Timer;

  protected readonly presentation = computed(
    () => AXIS_PRESENTATION[this.axis()],
  );
  protected readonly training = computed(
    () => AXIS_TRAINING[this.axis() as RailwayPlayableAxis],
  );
  protected readonly duration = computed(() => {
    const timer = this.training().timer;
    return timer.model === AxisTimerModel.GLOBAL
      ? formatDuration(timer.durationSec)
      : null;
  });
}
