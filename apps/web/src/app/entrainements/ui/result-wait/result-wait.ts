import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import {
  AxisType,
  FULL_SESSION_LABEL,
  RailwayPlayableAxis,
} from '@psychotech/shared';
import { ChartColumn, RotateCw, TriangleAlert } from 'lucide-angular';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { Icon } from '../../../shared/ui/icon/icon';

const RESULT_WAIT_TRACK_COLORS: Record<RailwayPlayableAxis, string> = {
  [AxisType.LOGIC]: 'var(--axis-logic-track)',
  [AxisType.MEMORY]: 'var(--axis-memory-track)',
  [AxisType.VISUAL_DISCRIMINATION]: 'var(--axis-discrimination-track)',
  [AxisType.REACTIVITY]: 'var(--axis-reactivity-track)',
  [AxisType.MOTOR_SKILLS]: 'var(--axis-motor-track)',
};

const SIMULATION_TRACK_COLOR = 'var(--brand-track)';

export type ResultWaitFailure = 'completion' | 'prefetch' | 'session-closed';

interface ResultWaitFailureCopy {
  title: string;
  legend: string;
  quitLabel: string;
  retryable: boolean;
}

const FAILURE_COPY: Record<ResultWaitFailure, ResultWaitFailureCopy> = {
  completion: {
    title: "L'envoi de vos réponses n'a pas abouti.",
    legend:
      'Vos réponses sont conservées sur cette page. Gardez-la ouverte, vérifiez votre connexion, puis réessayez.',
    quitLabel: 'Quitter sans envoyer',
    retryable: true,
  },
  prefetch: {
    title: "Le calcul n'a pas abouti.",
    legend: "Vos réponses sont bien enregistrées, rien n'est perdu.",
    quitLabel: 'Quitter',
    retryable: true,
  },
  'session-closed': {
    title: "Cette session n'est plus active.",
    legend:
      "Elle a été interrompue depuis un autre appareil ou un autre onglet. Vos réponses n'ont pas pu être envoyées.",
    quitLabel: 'Quitter',
    retryable: false,
  },
};

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
      #overlay
      class="wait overlay-screen"
      tabindex="-1"
      [class.wait--failed]="failed()"
      [attr.role]="failed() ? 'alert' : 'status'"
      [attr.aria-live]="failed() ? 'assertive' : 'polite'"
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
            <circle class="wait__arc" cx="66" cy="66" r="60" pathLength="100" />
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
          <p class="wait__patience" [class.wait__patience--visible]="slow()">
            Encore un instant…
          </p>
        }
      </div>

      @if (failureCopy(); as copy) {
        <div class="wait__actions">
          @if (copy.retryable) {
            <button type="button" class="wait__retry" (click)="retry.emit()">
              <ui-icon [img]="retryIcon" [size]="15" />
              <span>Réessayer</span>
            </button>
            <button type="button" class="wait__quit" (click)="quit.emit()">
              {{ copy.quitLabel }}
            </button>
          } @else {
            <button type="button" class="wait__retry" (click)="quit.emit()">
              {{ copy.quitLabel }}
            </button>
          }
        </div>
      }
    </div>
  `,
  styleUrls: ['../session-overlay.css', './result-wait.css'],
})
export class ResultWait {
  readonly axis = input.required<AxisType>();
  readonly simulation = input(false);
  readonly failure = input<ResultWaitFailure | null>(null);
  readonly slow = input(false);
  readonly retry = output<void>();
  readonly quit = output<void>();

  protected readonly retryIcon = RotateCw;
  protected readonly failureCopy = computed(() => {
    const failure = this.failure();
    return failure ? FAILURE_COPY[failure] : null;
  });
  protected readonly failed = computed(() => this.failureCopy() !== null);

  private readonly overlay = viewChild<ElementRef<HTMLElement>>('overlay');

  constructor() {
    afterRenderEffect(() => {
      if (this.failed()) {
        this.overlay()?.nativeElement.focus({ preventScroll: true });
      }
    });
  }

  protected readonly theme = computed<ResultWaitTheme>(() => {
    if (this.simulation()) {
      return {
        pastel: 'var(--brand-pastel)',
        accent: 'var(--brand)',
        deep: 'var(--brand-hover)',
        chipBorder: 'var(--brand-pastel-bd)',
        track: SIMULATION_TRACK_COLOR,
        chipLabel: FULL_SESSION_LABEL,
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
    const copy = this.failureCopy();
    if (copy) {
      return copy.title;
    }
    return this.simulation()
      ? 'Préparation de votre bilan'
      : 'Analyse de votre performance';
  });

  protected readonly legend = computed(() => {
    const copy = this.failureCopy();
    if (copy) {
      return copy.legend;
    }
    return this.simulation()
      ? 'Les 5 axes sont en cours de consolidation.'
      : "Vos réponses sont en cours d'évaluation.";
  });
}
