import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
} from '@angular/core';
import {
  AXIS_TRAINING,
  AXIS_TUTORIAL,
  AxisTimerModel,
  AxisType,
  LOGIC_FAMILY_FILTER_LABELS,
  LogicFamilyFilter,
  RailwayPlayableAxis,
  TrainingOptionId,
  trainingOptionsForAxis,
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

interface FamilyChoice {
  value: LogicFamilyFilter | null;
  label: string;
}

const LOGIC_FAMILY_CHOICES: FamilyChoice[] = [
  { value: null, label: 'Tous les blocs' },
  ...(Object.values(LogicFamilyFilter) as LogicFamilyFilter[]).map(
    (value) => ({ value, label: LOGIC_FAMILY_FILTER_LABELS[value] }),
  ),
];

const LOGIC_FAMILY_VOLUME_LABELS: Record<LogicFamilyFilter, string> = {
  [LogicFamilyFilter.NUMERIC]: 'items · Suites numériques',
  [LogicFamilyFilter.DOMINO]: 'items · Dominos',
  [LogicFamilyFilter.MATRIX]: 'items · Matrices (20 + 20)',
};

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
        @if (positionLabel(); as position) {
          <span class="axis-briefing__position">{{ position }}</span>
        }
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
              <span class="axis-briefing__metric-label">{{
                time().label
              }}</span>
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

        @if (
          showOptions() &&
          (trainingOptions().length > 0 || showFamilySelector())
        ) {
          <article class="axis-briefing__card">
            <span class="axis-briefing__label">Options d'entraînement</span>
            @for (option of trainingOptions(); track option.id) {
              <div class="axis-briefing__option">
                <div class="axis-briefing__option-copy">
                  <span class="axis-briefing__option-title">{{
                    option.label
                  }}</span>
                  <span class="axis-briefing__option-detail">{{
                    option.description
                  }}</span>
                </div>
                <ui-toggle
                  [checked]="isOptionEnabled(option.id)"
                  [label]="option.label"
                  (checkedChange)="setOptionEnabled(option.id, $event)"
                />
              </div>
            }
            @if (showFamilySelector()) {
              <div class="axis-briefing__families">
                <div class="axis-briefing__option-copy">
                  <span class="axis-briefing__option-title">Familles</span>
                  <span class="axis-briefing__option-detail"
                    >Blocs d'items travaillés pendant la session</span
                  >
                </div>
                <div
                  class="axis-briefing__family-chips"
                  role="radiogroup"
                  aria-label="Familles"
                >
                  @for (choice of familyChoices; track choice.label) {
                    <button
                      type="button"
                      role="radio"
                      class="axis-briefing__family-chip"
                      [class.axis-briefing__family-chip--active]="
                        logicFamily() === choice.value
                      "
                      [attr.aria-checked]="logicFamily() === choice.value"
                      (click)="logicFamily.set(choice.value)"
                    >
                      {{ choice.label }}
                    </button>
                  }
                </div>
              </div>
            }
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
  readonly showOptions = input(true);
  readonly tutorial = input(false);
  readonly positionLabel = input<string | null>(null);
  readonly enabledOptions = model<TrainingOptionId[]>([]);
  readonly logicFamily = model<LogicFamilyFilter | null>(null);

  protected readonly trainingOptions = computed(() =>
    trainingOptionsForAxis(this.axis()),
  );

  protected readonly familyChoices = LOGIC_FAMILY_CHOICES;

  protected readonly showFamilySelector = computed(
    () => !this.tutorial() && this.axis() === AxisType.LOGIC,
  );

  protected isOptionEnabled(id: TrainingOptionId): boolean {
    return this.enabledOptions().includes(id);
  }

  protected setOptionEnabled(id: TrainingOptionId, enabled: boolean): void {
    this.enabledOptions.update((ids) =>
      enabled
        ? [...ids.filter((other) => other !== id), id]
        : ids.filter((other) => other !== id),
    );
  }

  protected readonly volumeIcon = LayoutGrid;
  protected readonly timeIcon = Clock;
  protected readonly thresholdIcon = Target;
  protected readonly volumeDesktopIcon = ListChecks;
  protected readonly timeDesktopIcon = Timer;

  protected readonly presentation = computed(
    () => AXIS_PRESENTATION[this.axis()],
  );
  protected readonly training = computed(() =>
    this.tutorial()
      ? AXIS_TUTORIAL[this.axis() as RailwayPlayableAxis]
      : AXIS_TRAINING[this.axis() as RailwayPlayableAxis],
  );

  protected readonly volume = computed<SummaryTile>(() => {
    const training = this.training();
    switch (training.axis) {
      case AxisType.LOGIC: {
        if (this.tutorial()) {
          return { value: `${training.exerciseCount}`, label: 'items' };
        }
        const family = this.logicFamily();
        return {
          value: `${training.exerciseCount}`,
          label:
            family === null
              ? 'items · 4 familles'
              : LOGIC_FAMILY_VOLUME_LABELS[family],
        };
      }
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
        if (
          training.timer.model === AxisTimerModel.GLOBAL &&
          this.enabledOptions().includes(TrainingOptionId.NO_TIMER)
        ) {
          return { value: 'Libre', label: 'sans chronomètre' };
        }
        return {
          value: formatDuration(training.timer.durationSec),
          label: 'temps global',
        };
    }
  });
}
