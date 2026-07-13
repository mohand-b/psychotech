import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AXIS_TUTORIAL,
  AxisType,
  MOTRICITY_TUTORIAL_START_WIDTH,
  SubscriptionTier,
  TUTORIAL_SEED,
  generateDiscriminationSession,
  generateLogicSession,
  generateMemorySession,
  generateMotricityCourses,
  generateReactivitySession,
  scoreDiscriminationSession,
  scoreLogicSession,
  scoreMemorySession,
  scoreMotricityCourse,
  scoreReactivitySession,
} from '@psychotech/shared';
import { ArrowRight, RotateCcw } from 'lucide-angular';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import {
  ResultMetricRow,
  ResultMetrics,
} from '../../ui/result-metrics/result-metrics';
import { axisButtonColor } from '../../ui/axis-button-color';
import { axisFromSlug, axisSlug } from '../../../shared/util/axis-slug';
import { TutorialRunFacade } from '../../data-access/tutorial-run.facade';
import { TUTORIAL_SESSION_ID } from '../../data-access/tutorial-session.facade';
import { TutorialRunResult } from '../../data-access/tutorial-run.store';

function formatSeconds(ms: number | null): string {
  return ms === null ? '-' : `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
}

function tutorialMetricRows(result: TutorialRunResult): ResultMetricRow[] {
  switch (result.axis) {
    case AxisType.LOGIC: {
      const scored = scoreLogicSession(
        generateLogicSession(TUTORIAL_SEED, AXIS_TUTORIAL[AxisType.LOGIC]),
        result.items,
      );
      return [
        {
          label: 'Bonnes réponses',
          value: `${scored.correctCount}/${result.items.length}`,
        },
        {
          label: 'Temps moyen par item',
          value: formatSeconds(scored.avgAnswerTimeMs),
        },
      ];
    }
    case AxisType.MEMORY: {
      const scored = scoreMemorySession(
        generateMemorySession(TUTORIAL_SEED, AXIS_TUTORIAL[AxisType.MEMORY]),
        result.sequences,
      );
      return [
        {
          label: 'Séquence restituée',
          value: scored.perfectCount > 0 ? 'Sans faute' : 'Avec erreurs',
        },
        {
          label: 'Chiffres bien placés',
          value: `${Math.round(scored.placedPct)}`,
          suffix: '%',
        },
      ];
    }
    case AxisType.VISUAL_DISCRIMINATION: {
      const scored = scoreDiscriminationSession(
        generateDiscriminationSession(
          TUTORIAL_SEED,
          AXIS_TUTORIAL[AxisType.VISUAL_DISCRIMINATION],
        ),
        result.trials,
      );
      return [
        {
          label: 'Essais corrects',
          value: `${scored.correctCount}/${result.trials.length}`,
        },
        {
          label: 'Temps moyen par essai',
          value: formatSeconds(scored.avgAnswerTimeMs),
        },
      ];
    }
    case AxisType.REACTIVITY: {
      const scored = scoreReactivitySession(
        generateReactivitySession(
          TUTORIAL_SEED,
          AXIS_TUTORIAL[AxisType.REACTIVITY],
        ),
        result.stimuli,
        result.waitPresses,
      );
      return [
        {
          label: 'Temps de réaction moyen',
          value:
            scored.trMoyMs === null ? '-' : `${Math.round(scored.trMoyMs)}`,
          suffix: 'ms',
        },
        {
          label: 'Erreurs de commande',
          value: `${scored.wrongCommandCount}`,
        },
        {
          label: 'Signaux manqués',
          value: `${scored.omissionCount}`,
        },
      ];
    }
    case AxisType.MOTOR_SKILLS: {
      const course = generateMotricityCourses(TUTORIAL_SEED, {
        courseCount: 1,
        startWidths: [MOTRICITY_TUTORIAL_START_WIDTH],
      })[0];
      const scored = scoreMotricityCourse(
        course,
        result.courses[0]?.samples ?? [],
      );
      return [
        {
          label: 'Parcours complété',
          value: `${Math.round(scored.progressionPct)}`,
          suffix: '%',
        },
        { label: 'Erreurs mineures', value: `${scored.minorErrors}` },
        { label: 'Erreurs majeures', value: `${scored.majorErrors}` },
      ];
    }
  }
}

@Component({
  selector: 'app-tutorial-end',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, ResultMetrics, RouterLink],
  templateUrl: './tutorial-end.html',
  styleUrl: './tutorial-end.css',
})
export class TutorialEnd {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly runFacade = inject(TutorialRunFacade);
  private readonly coreFacade = inject(CoreFacade);

  protected readonly arrowIcon = ArrowRight;
  protected readonly retryIcon = RotateCcw;

  private readonly axis = axisFromSlug(
    this.route.snapshot.paramMap.get('axis'),
  );

  protected readonly presentation = this.axis
    ? AXIS_PRESENTATION[this.axis]
    : null;
  protected readonly buttonColor = this.axis
    ? axisButtonColor(this.axis)
    : 'brand';

  protected readonly replayLink = this.axis
    ? [
        '/entrainements/tutoriel',
        axisSlug(this.axis),
        'session',
        TUTORIAL_SESSION_ID,
      ]
    : ['/entrainements'];

  protected readonly targetedLink = this.axis
    ? ['/entrainements/cible', axisSlug(this.axis)]
    : ['/entrainements'];

  protected readonly isFree = computed(
    () => this.coreFacade.tier() === SubscriptionTier.FREE,
  );

  protected readonly metricRows = computed<ResultMetricRow[]>(() => {
    const result = this.runFacade.result();
    return result && result.axis === this.axis
      ? tutorialMetricRows(result)
      : [];
  });

  constructor() {
    const result = this.runFacade.result();
    if (this.axis === null || result === null || result.axis !== this.axis) {
      this.router.navigate(
        this.axis
          ? ['/entrainements/tutoriel', axisSlug(this.axis)]
          : ['/entrainements'],
      );
    }
  }
}
