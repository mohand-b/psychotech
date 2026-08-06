import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AxisFinding,
  AxisType,
  LogicFamilyResultDto,
  LogicSessionScore,
  LogicItem,
  TargetedLogicResultDto,
  analyzeLogic,
  getAxisRecommendations,
  scoreLogicSession,
} from '@psychotech/shared';
import { revealSessionBadges } from '../../../badges/data-access/badge-reveal';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { BadgeUnlock } from '../../../shared/ui/badge-unlock/badge-unlock';
import { axisSlug } from '../../../shared/util/axis-slug';
import { backFromTargetedResult } from '../../ui/result-navigation';
import {
  buildLogicChartEntries,
  buildLogicMetricRows,
} from '../../../shared/ui/axis-result-content';
import {
  logicAnalyzerItems,
  logicFamilyBoundaries,
  logicItemsForResult,
} from '../../../shared/ui/logic-result-items';
import { ResultActions } from '../../ui/result-actions/result-actions';
import { ResultFamilyBars } from '../../../shared/ui/result-family-bars/result-family-bars';
import {
  ResultMetricRow,
  ResultMetrics,
} from '../../../shared/ui/result-metrics/result-metrics';
import { ResultPage } from '../../ui/result-page/result-page';
import { ResultPanel } from '../../ui/result-panel/result-panel';
import { ResultRecommendation } from '../../ui/result-recommendation/result-recommendation';
import { ResultSummary } from '../../ui/result-summary/result-summary';
import { sectorReferentialFor } from '../sector-referential';
import { ResultTiming } from '../../ui/result-timing/result-timing';
import { TimeChart, TimeChartEntry } from '../../../shared/ui/time-chart/time-chart';

@Component({
  selector: 'app-logic-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeUnlock,
    ResultActions,
    ResultFamilyBars,
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly sessionId =
    this.route.snapshot.paramMap.get('sessionId') ?? '';
  private readonly cameFromPlay = this.facade.session()?.id === this.sessionId;
  protected readonly backLabel = this.cameFromPlay
    ? 'Retour aux axes'
    : 'Retour aux sessions';
  protected readonly unlockedBadges = revealSessionBadges(this.sessionId);

  protected readonly axis = AxisType.LOGIC;
  protected readonly result = signal<TargetedLogicResultDto | null>(null);

  protected readonly referential = sectorReferentialFor(
    computed(() => this.result()?.sector ?? null),
  );

  constructor() {
    this.facade
      .loadTargetedResult(this.sessionId, AxisType.LOGIC)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (result.axis === AxisType.LOGIC) {
            this.result.set(result);
          }
        },
        error: () => this.router.navigate(['/entrainements']),
      });
  }

  private readonly items = computed<LogicItem[] | null>(() => {
    const result = this.result();
    return result ? logicItemsForResult(result) : null;
  });

  protected readonly scored = computed<LogicSessionScore | null>(() => {
    const result = this.result();
    const items = this.items();
    return result && items ? scoreLogicSession(items, result.items) : null;
  });

  protected readonly recommendations = computed<AxisFinding[]>(() => {
    const result = this.result();
    const items = this.items();
    const scored = this.scored();
    return result && items && scored
      ? getAxisRecommendations(
          analyzeLogic(
            logicAnalyzerItems(items),
            scored,
            result.items,
            items,
            result.logicFamily,
          ),
        )
      : [];
  });

  protected readonly recordVisible = computed(() => {
    const result = this.result();
    return !result || (result.logicFamily === null && !result.untimed);
  });

  protected readonly metricRows = computed<ResultMetricRow[]>(() => {
    const result = this.result();
    const scored = this.scored();
    return result && scored ? buildLogicMetricRows(scored, result) : [];
  });

  protected readonly families = computed<LogicFamilyResultDto[]>(
    () => this.result()?.families ?? [],
  );

  protected readonly familyBoundaries = computed<number[]>(() =>
    logicFamilyBoundaries(this.items() ?? []),
  );

  protected readonly chartEntries = computed<TimeChartEntry[]>(() => {
    const result = this.result();
    const scored = this.scored();
    return result && scored ? buildLogicChartEntries(scored, result) : [];
  });

  protected review(): void {
    this.router.navigate([
      '/entrainements/cible',
      axisSlug(AxisType.LOGIC),
      'session',
      this.sessionId,
      'correction',
    ]);
  }

  protected newTraining(): void {
    this.router.navigate(['/entrainements/cible', axisSlug(AxisType.LOGIC)]);
  }

  protected back(): void {
    backFromTargetedResult(this.router, this.cameFromPlay);
  }
}
