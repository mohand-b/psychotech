import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AXIS_TRAINING,
  AxisType,
  DiscriminationOutcome,
  DiscriminationSessionScore,
  TargetedDiscriminationResultDto,
  TrainingRecommendation,
  generateDiscriminationSession,
  getDiscriminationRecommendation,
  scoreDiscriminationSession,
} from '@psychotech/shared';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { ResultActions } from '../../ui/result-actions/result-actions';
import {
  ResultMetricRow,
  ResultMetrics,
} from '../../ui/result-metrics/result-metrics';
import { ResultPage } from '../../ui/result-page/result-page';
import { ResultPanel } from '../../ui/result-panel/result-panel';
import { ResultRecommendation } from '../../ui/result-recommendation/result-recommendation';
import { ResultSummary } from '../../ui/result-summary/result-summary';
import { ResultTiming } from '../../ui/result-timing/result-timing';
import { TimeChart, TimeChartEntry } from '../../ui/time-chart/time-chart';

const OUTCOME_LABELS: Record<DiscriminationOutcome, string> = {
  TRUE_POSITIVE: 'Juste',
  TRUE_NEGATIVE: 'Juste',
  FALSE_POSITIVE: 'Répondu "différentes" à tort',
  FALSE_NEGATIVE: 'Répondu "identiques" à tort',
};

@Component({
  selector: 'app-discrimination-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ResultActions,
    ResultMetrics,
    ResultPage,
    ResultPanel,
    ResultRecommendation,
    ResultSummary,
    ResultTiming,
    TimeChart,
  ],
  templateUrl: './discrimination-result.html',
})
export class DiscriminationResult {
  private readonly facade = inject(TrainingSessionFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly sessionId =
    this.route.snapshot.paramMap.get('sessionId') ?? '';
  private readonly presentation =
    AXIS_PRESENTATION[AxisType.VISUAL_DISCRIMINATION];
  private readonly training = AXIS_TRAINING[AxisType.VISUAL_DISCRIMINATION];

  protected readonly result = signal<TargetedDiscriminationResultDto | null>(
    null,
  );

  constructor() {
    this.facade
      .loadTargetedResult(this.sessionId, AxisType.VISUAL_DISCRIMINATION)
      .subscribe({
        next: (result) => {
          if (result.axis === AxisType.VISUAL_DISCRIMINATION) {
            this.result.set(result);
          }
        },
        error: () => this.router.navigate(['/entrainements']),
      });
  }

  protected readonly scored = computed<DiscriminationSessionScore | null>(() => {
    const result = this.result();
    return result
      ? scoreDiscriminationSession(
          generateDiscriminationSession(result.seed),
          result.trials,
        )
      : null;
  });

  protected readonly recommendation = computed<TrainingRecommendation | null>(
    () => {
      const scored = this.scored();
      return scored ? getDiscriminationRecommendation(scored) : null;
    },
  );

  protected readonly metricRows = computed<ResultMetricRow[]>(() => {
    const scored = this.scored();
    if (!scored) {
      return [];
    }
    const avg = scored.avgAnswerTimeMs;
    return [
      {
        label: 'Réponses justes',
        value: `${scored.correctCount}`,
        suffix: `/${this.training.exerciseCount}`,
      },
      {
        label: 'Répondu "identiques" à tort',
        value: `${scored.wrongIdenticalCount}`,
      },
      {
        label: 'Répondu "différentes" à tort',
        value: `${scored.wrongDifferentCount}`,
      },
      {
        label: 'Essais non atteints',
        value: `${scored.unansweredCount}`,
      },
      {
        label: 'Temps moyen par réponse',
        value:
          avg === null
            ? '-'
            : (avg / 1000).toLocaleString('fr-FR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }),
        suffix: avg === null ? undefined : ' s',
      },
    ];
  });

  protected readonly chartEntries = computed<TimeChartEntry[]>(() => {
    const result = this.result();
    const scored = this.scored();
    if (!result || !scored) {
      return [];
    }
    const responseByIndex = new Map(
      result.trials.map((trialAnswer) => [trialAnswer.index, trialAnswer]),
    );
    return scored.outcomes.map((outcome, index) => {
      const response = responseByIndex.get(index);
      const answered = (response?.answer ?? null) !== null;
      if (!answered) {
        return {
          colorVar: 'var(--text-disabled)',
          label: 'Non atteint',
          timeMs: null,
        };
      }
      const correct =
        outcome === 'TRUE_POSITIVE' || outcome === 'TRUE_NEGATIVE';
      return {
        colorVar: correct ? this.presentation.plainVar : 'var(--danger)',
        label: OUTCOME_LABELS[outcome],
        timeMs: response?.timeMs ?? null,
      };
    });
  });

  protected newTraining(): void {
    this.router.navigate([
      '/entrainements/cible',
      AxisType.VISUAL_DISCRIMINATION,
    ]);
  }

  protected backToAxes(): void {
    this.router.navigate(['/entrainements/choisir-axe']);
  }
}
