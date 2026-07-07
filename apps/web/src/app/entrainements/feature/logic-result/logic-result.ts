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
  LogicRecommendation,
  LogicSessionScore,
  RecommendationPriority,
  ScoreBand,
  TargetedLogicResultDto,
  generateLogicSession,
  getLogicRecommendation,
  scoreLogicSession,
} from '@psychotech/shared';
import { ArrowRight, ListChecks, Play } from 'lucide-angular';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { Button } from '../../../shared/ui/button/button';
import {
  formatDayTime,
  formatDuration,
  formatSecondsTenths,
} from '../../../shared/ui/format-duration';
import { Icon } from '../../../shared/ui/icon/icon';
import { resolveScoreRating } from '../../../shared/ui/score-rating';
import { SECTOR_PRESENTATION } from '../../../shared/ui/sector-presentation';
import {
  LogicTimeChart,
  LogicTimeChartEntry,
} from '../../ui/logic-time-chart/logic-time-chart';

const VERDICT_LABELS: Record<ScoreBand, string> = {
  [ScoreBand.EXCELLENT]: 'Favorable',
  [ScoreBand.ACCEPTABLE]: 'Acceptable',
  [ScoreBand.FRAGILE]: 'Limite',
  [ScoreBand.INSUFFICIENT]: 'Défavorable',
};

const PRIORITY_BADGES: Record<
  RecommendationPriority,
  { label: string; mobileLabel: string; pastelVar: string; textVar: string }
> = {
  [RecommendationPriority.HIGH]: {
    label: 'Haute',
    mobileLabel: 'Priorité haute',
    pastelVar: 'var(--danger-pastel)',
    textVar: 'var(--danger-text)',
  },
  [RecommendationPriority.MEDIUM]: {
    label: 'Moyenne',
    mobileLabel: 'Priorité moyenne',
    pastelVar: 'var(--warning-pastel)',
    textVar: 'var(--warning-text)',
  },
  [RecommendationPriority.LOW]: {
    label: 'Conseil',
    mobileLabel: 'Conseil',
    pastelVar: 'var(--brand-pastel)',
    textVar: 'var(--brand)',
  },
};

@Component({
  selector: 'app-logic-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, LogicTimeChart],
  templateUrl: './logic-result.html',
  styleUrl: './logic-result.css',
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

  protected readonly playIcon = Play;
  protected readonly reviewIcon = ListChecks;
  protected readonly arrowIcon = ArrowRight;

  constructor() {
    this.facade.loadLogicResult(this.sessionId).subscribe({
      next: (result) => this.result.set(result),
      error: () => this.router.navigate(['/entrainements']),
    });
  }

  protected readonly scored = computed<LogicSessionScore | null>(() => {
    const result = this.result();
    return result
      ? scoreLogicSession(generateLogicSession(result.seed), result.items)
      : null;
  });

  protected readonly recommendation = computed<LogicRecommendation | null>(
    () => {
      const result = this.result();
      const scored = this.scored();
      return result && scored
        ? getLogicRecommendation(scored, result.items)
        : null;
    },
  );

  protected readonly priorityBadge = computed(() => {
    const recommendation = this.recommendation();
    return recommendation ? PRIORITY_BADGES[recommendation.priority] : null;
  });

  protected readonly subtitle = computed(() => {
    const result = this.result();
    if (!result) {
      return '';
    }
    const sector = SECTOR_PRESENTATION[result.sector].label;
    return `Entraînement ciblé · ${sector} · ${formatDayTime(result.completedAt)}`;
  });

  protected readonly verdictLabel = computed(() => {
    const result = this.result();
    return result ? VERDICT_LABELS[result.band] : '';
  });

  protected readonly verdictColor = computed(() => {
    const result = this.result();
    return result ? resolveScoreRating(result.score).colorVar : '';
  });

  protected readonly delta = computed(() => {
    const result = this.result();
    return result && result.previousScore !== null
      ? result.score - result.previousScore
      : null;
  });

  protected readonly bestSuffix = computed(() => {
    const result = this.result();
    if (!result) {
      return '';
    }
    if (result.isNewBest) {
      return " — record battu aujourd'hui";
    }
    return result.isEqualBest ? " — record égalé aujourd'hui" : '';
  });

  protected readonly avgAnswerTime = computed(() => {
    const avg = this.scored()?.avgAnswerTimeMs ?? null;
    return avg === null ? '—' : formatSecondsTenths(avg);
  });

  protected readonly remainingAtEnd = computed(() => {
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

  protected readonly chartEntries = computed<LogicTimeChartEntry[]>(() => {
    const result = this.result();
    const scored = this.scored();
    if (!result || !scored) {
      return [];
    }
    const timeByIndex = new Map(
      result.items.map((item) => [item.index, item.timeMs]),
    );
    return scored.statuses.map((status, index) => ({
      status,
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
