import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
} from '@angular/core';
import {
  AXIS_TRAINING,
  AxisType,
  RailwayPlayableAxis,
} from '@psychotech/shared';
import { Clock, LayoutGrid, ListChecks, Target, Timer } from 'lucide-angular';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { formatDuration } from '../../../shared/ui/format-duration';
import { Icon } from '../../../shared/ui/icon/icon';
import { Toggle } from '../../../shared/ui/toggle/toggle';

interface SummaryTile {
  value: string;
  label: string;
}

@Component({
  selector: 'ui-axis-briefing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Toggle],
  template: `
    <div
      class="axis-briefing"
      [style.--axis-plain]="presentation().plainVar"
      [style.--axis-pastel]="presentation().pastelVar"
      [style.--axis-pastel-bd]="presentation().pastelBorderVar"
    >
      <header class="axis-briefing__head">
        <span class="axis-briefing__tile">
          <ui-icon [img]="presentation().icon" [size]="32" />
        </span>
        <h1 class="axis-briefing__name">{{ presentation().label }}</h1>
      </header>

      <div class="axis-briefing__cards">
        <article class="axis-briefing__card">
          <span class="axis-briefing__label">Consigne</span>
          <p class="axis-briefing__text">{{ training().briefing.consigne }}</p>
        </article>

      <article class="axis-briefing__card">
        <span class="axis-briefing__label">Objectif</span>
        <p class="axis-briefing__text">{{ training().briefing.objectif }}</p>
      </article>

      <article class="axis-briefing__card axis-briefing__card--summary">
        <span class="axis-briefing__label">Résumé</span>
        <div class="axis-briefing__metrics">
          <span class="axis-briefing__metric">
            <ui-icon
              class="axis-briefing__metric-icon axis-briefing__metric-icon--desktop"
              [img]="volumeDesktopIcon"
              [size]="15"
            />
            <ui-icon
              class="axis-briefing__metric-icon axis-briefing__metric-icon--mobile"
              [img]="volumeIcon"
              [size]="18"
            />
            <span class="axis-briefing__metric-value t-mono">{{
              volume().value
            }}</span>
            <span class="axis-briefing__metric-label">{{
              volume().label
            }}</span>
          </span>
          <span class="axis-briefing__metric">
            <ui-icon
              class="axis-briefing__metric-icon axis-briefing__metric-icon--desktop"
              [img]="timeDesktopIcon"
              [size]="15"
            />
            <ui-icon
              class="axis-briefing__metric-icon axis-briefing__metric-icon--mobile"
              [img]="timeIcon"
              [size]="18"
            />
            <span class="axis-briefing__metric-value t-mono">{{
              time().value
            }}</span>
            <span class="axis-briefing__metric-label">{{ time().label }}</span>
          </span>
          @if (admissibilityThreshold(); as threshold) {
            <span class="axis-briefing__metric">
              <ui-icon
                class="axis-briefing__metric-icon axis-briefing__metric-icon--mobile"
                [img]="thresholdIcon"
                [size]="18"
              />
              <span class="axis-briefing__metric-value t-mono">{{
                threshold
              }}</span>
              <span
                class="axis-briefing__metric-label axis-briefing__metric-label--desktop"
                >seuil d'admission</span
              >
              <span
                class="axis-briefing__metric-label axis-briefing__metric-label--mobile"
                >seuil</span
              >
            </span>
          }
        </div>
      </article>

        @if (optionsEnabled()) {
          <article class="axis-briefing__card">
            <span class="axis-briefing__label">Options d'entraînement</span>
            <div class="axis-briefing__option">
              <div class="axis-briefing__option-copy">
                <span class="axis-briefing__option-title"
                  >Aide pendant la session</span
                >
                <span class="axis-briefing__option-detail"
                  >Affichez la règle de la suite pendant un exercice - la
                  règle, pas la réponse.</span
                >
              </div>
              <ui-toggle
                [(checked)]="helpEnabled"
                label="Aide pendant la session"
              />
            </div>
          </article>
        }
      </div>
    </div>
  `,
  styleUrl: './axis-briefing.css',
})
export class AxisBriefing {
  readonly axis = input.required<AxisType>();
  readonly admissibilityThreshold = input<number | null>(null);
  readonly optionsEnabled = input(false);
  readonly helpEnabled = model(false);

  protected readonly volumeIcon = LayoutGrid;
  protected readonly timeIcon = Clock;
  protected readonly thresholdIcon = Target;
  protected readonly volumeDesktopIcon = ListChecks;
  protected readonly timeDesktopIcon = Timer;

  protected readonly presentation = computed(
    () => AXIS_PRESENTATION[this.axis()],
  );
  protected readonly training = computed(
    () => AXIS_TRAINING[this.axis() as RailwayPlayableAxis],
  );

  protected readonly volume = computed<SummaryTile>(() => {
    const training = this.training();
    switch (training.axis) {
      case AxisType.LOGIC:
        return { value: `${training.exerciseCount}`, label: 'items' };
      case AxisType.MEMORY:
        return { value: `${training.exerciseCount}`, label: 'séquences' };
      case AxisType.VISUAL_DISCRIMINATION:
        return { value: `${training.exerciseCount}`, label: 'essais' };
      case AxisType.REACTIVITY:
        return {
          value: `≈${training.approximateStimulusCount}`,
          label: 'stimulus',
        };
      case AxisType.MOTOR_SKILLS:
        return { value: `${training.exerciseCount}`, label: 'parcours' };
    }
  });

  protected readonly time = computed<SummaryTile>(() => {
    const training = this.training();
    switch (training.axis) {
      case AxisType.MEMORY:
        return {
          value: formatDuration(training.restitutionSec),
          label: 'par restitution',
        };
      case AxisType.MOTOR_SKILLS:
        return {
          value: formatDuration(training.secondsPerCourse),
          label: 'par parcours',
        };
      default:
        return {
          value: formatDuration(training.timer.durationSec),
          label: 'temps global',
        };
    }
  });

}
