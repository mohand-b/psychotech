import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { AxisType, RailwayPlayableAxis } from '@psychotech/shared';
import { ChartColumn, RotateCw, TriangleAlert } from 'lucide-angular';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { Icon } from '../../../shared/ui/icon/icon';

export const RESULT_WAIT_TRACK_COLORS: Record<RailwayPlayableAxis, string> = {
  [AxisType.LOGIC]: '#D5E3FC',
  [AxisType.MEMORY]: '#E5DBFD',
  [AxisType.VISUAL_DISCRIMINATION]: '#CAF0E3',
  [AxisType.REACTIVITY]: '#FDEBCF',
  [AxisType.MOTOR_SKILLS]: '#FBD6D6',
};

const SIMULATION_TRACK_COLOR = '#E0D7FD';

interface ResultWaitTheme {
  pastel: string;
  accent: string;
  deep: string;
  chipBorder: string;
  track: string;
  chipLabel: string;
}

@Component({
  selector: 'ui-result-wait',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div
      class="wait overlay-screen"
      [class.wait--failed]="failed()"
      role="status"
      aria-live="polite"
      [style.--wait-pastel]="theme().pastel"
      [style.--wait-accent]="theme().accent"
      [style.--wait-deep]="theme().deep"
      [style.--wait-chip-bd]="theme().chipBorder"
      [style.--wait-track]="theme().track"
    >
      <span class="wait__chip">
        <span class="wait__chip-dot"></span>
        <span>{{ theme().chipLabel }}</span>
      </span>

      <div class="wait__stage overlay-stage">
        <svg
          class="wait__ring wait__ring--desktop"
          viewBox="0 0 220 220"
          aria-hidden="true"
        >
          <circle class="wait__track" cx="110" cy="110" r="100" />
          @if (!failed()) {
            <circle
              class="wait__arc"
              cx="110"
              cy="110"
              r="100"
              pathLength="100"
            />
          }
        </svg>
        <svg
          class="wait__ring wait__ring--mobile"
          viewBox="0 0 132 132"
          aria-hidden="true"
        >
          <circle class="wait__track" cx="66" cy="66" r="60" />
          @if (!failed()) {
            <circle
              class="wait__arc"
              cx="66"
              cy="66"
              r="60"
              pathLength="100"
            />
          }
        </svg>
        <ui-icon
          class="wait__icon wait__icon--desktop"
          [img]="stateIcon()"
          [size]="52"
          [strokeWidth]="1.7"
        />
        <ui-icon
          class="wait__icon wait__icon--mobile"
          [img]="stateIcon()"
          [size]="38"
          [strokeWidth]="1.7"
        />
      </div>

      <div class="wait__texts">
        <p class="wait__title">{{ title() }}</p>
        <p class="wait__legend">{{ legend() }}</p>
        @if (!failed()) {
          <p
            class="wait__patience"
            [class.wait__patience--visible]="slow()"
          >
            Encore un instant…
          </p>
        }
      </div>

      @if (failed()) {
        <button type="button" class="wait__retry" (click)="retry.emit()">
          <ui-icon [img]="retryIcon" [size]="15" />
          <span>Réessayer</span>
        </button>
      }
    </div>
  `,
  styleUrls: ['../session-overlay.css', './result-wait.css'],
})
export class ResultWait {
  readonly axis = input.required<AxisType>();
  readonly simulation = input(false);
  readonly failed = input(false);
  readonly slow = input(false);
  readonly retry = output<void>();

  protected readonly retryIcon = RotateCw;

  protected readonly theme = computed<ResultWaitTheme>(() => {
    if (this.simulation()) {
      return {
        pastel: 'var(--brand-pastel)',
        accent: 'var(--brand)',
        deep: 'var(--brand-hover)',
        chipBorder: 'var(--brand-pastel-bd)',
        track: SIMULATION_TRACK_COLOR,
        chipLabel: 'Simulation complète',
      };
    }
    const presentation = AXIS_PRESENTATION[this.axis()];
    return {
      pastel: presentation.pastelVar,
      accent: presentation.plainVar,
      deep: presentation.textVar,
      chipBorder: presentation.pastelBorderVar,
      track: RESULT_WAIT_TRACK_COLORS[this.axis() as RailwayPlayableAxis],
      chipLabel: presentation.label,
    };
  });

  protected readonly stateIcon = computed(() =>
    this.failed() ? TriangleAlert : ChartColumn,
  );

  protected readonly title = computed(() => {
    if (this.failed()) {
      return "Le calcul n'a pas abouti.";
    }
    return this.simulation()
      ? 'Préparation de votre bilan'
      : 'Analyse de votre performance';
  });

  protected readonly legend = computed(() => {
    if (this.failed()) {
      return "Vos réponses sont bien enregistrées, rien n'est perdu.";
    }
    return this.simulation()
      ? 'Les 5 axes sont en cours de consolidation.'
      : "Vos réponses sont en cours d'évaluation.";
  });
}
