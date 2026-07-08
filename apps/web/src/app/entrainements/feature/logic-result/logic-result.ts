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
  LogicSessionScore,
  TargetedLogicResultDto,
  TrainingRecommendation,
  generateLogicSession,
  getLogicRecommendation,
  scoreLogicSession,
} from '@psychotech/shared';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { formatDuration } from '../../../shared/ui/format-duration';
import { LOGIC_STATUS_COLORS, LOGIC_STATUS_LABELS } from '../../ui/logic-status';
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

@Component({
  selector: 'app-logic-result',
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
  templateUrl: './logic-result.html',
})
export class LogicResult {
  private readonly facade = inject(TrainingSessionFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly sessionId =
    this.route.snapshot.paramMap.get('sessionId') ?? '';
  protected readonly presentation = AXIS_PRESENTATION[AxisType.LOGIC];
  protected readonly training = AXIS_TRAINING[AxisType.LOGIC];

  protected readonly result = signal<TargetedLogicResultDto | null>(null);

  constructor() {
    this.facade.loadTargetedResult(this.sessionId, AxisType.LOGIC).subscribe({
      next: (result) => {
        if (result.axis === AxisType.LOGIC) {
          this.result.set(result);
        }
      },
      error: () => this.router.navigate(['/entrainements']),
    });
  }

  protected readonly scored = computed<LogicSessionScore | null>(() => {
    const result = this.result();
    return result
      ? scoreLogicSession(generateLogicSession(result.seed), result.items)
      : null;
  });

  protected readonly recommendation = computed<TrainingRecommendation | null>(
    () => {
      const result = this.result();
      const scored = this.scored();
      return result && scored
        ? getLogicRecommendation(scored, result.items)
        : null;
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
        dotVar: this.presentation.plainVar,
      },
      {
        label: 'Erreurs',
        value: `${scored.wrongCount}`,
        dotVar: 'var(--danger)',
      },
      {
        label: 'Passés sans réponse',
        value: `${scored.skippedCount}`,
        dotVar: 'var(--warning)',
      },
      {
        label: 'Non atteints (chrono)',
        value: `${scored.unreachedCount}`,
        dotVar: 'var(--text-disabled)',
      },
      {
        label: 'Temps moyen par réponse',
        value:
          avg === null
            ? '—'
            : (avg / 1000).toLocaleString('fr-FR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }),
        suffix: avg === null ? undefined : ' s',
      },
      {
        label: 'Temps restant à la fin',
        value: this.remainingAtEnd(),
      },
    ];
  });

  private readonly remainingAtEnd = computed(() => {
    const result = this.result();
    if (!result) {
      return '—';
    }
    const elapsedSec = Math.round(
      (Date.parse(result.completedAt) - Date.parse(result.startedAt)) / 1000,
    );
    return formatDuration(
      Math.max(0, this.training.timer.durationSec - elapsedSec),
    );
  });

  protected readonly chartEntries = computed<TimeChartEntry[]>(() => {
    const result = this.result();
    const scored = this.scored();
    if (!result || !scored) {
      return [];
    }
    const timeByIndex = new Map(
      result.items.map((item) => [item.index, item.timeMs]),
    );
    return scored.statuses.map((status, index) => ({
      colorVar: LOGIC_STATUS_COLORS[status],
      label: LOGIC_STATUS_LABELS[status],
      timeMs: status === 'UNREACHED' ? null : (timeByIndex.get(index) ?? null),
    }));
  });

  protected review(): void {
    this.router.navigate([
      '/entrainements/cible',
      AxisType.LOGIC,
      'session',
      this.sessionId,
      'correction',
    ]);
  }

  protected newTraining(): void {
    this.router.navigate(['/entrainements/cible', AxisType.LOGIC]);
  }

  protected backToAxes(): void {
    this.router.navigate(['/entrainements/choisir-axe']);
  }
}
