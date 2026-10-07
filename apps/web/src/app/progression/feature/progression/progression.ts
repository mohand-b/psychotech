import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AxisProgressionDto,
  AxisType,
  FULL_SESSION_LABEL,
  FULL_SESSION_LABEL_LOWER,
  FULL_SESSION_LABEL_PLURAL_LOWER,
  Sector,
  SessionMode,
  TARGETED_SESSION_LABEL_PLURAL_LOWER,
  TrainingsAxisOverviewDto,
  fullSessionCountLabel,
  fullSessionShortCountLabel,
  roundToTenth,
  targetedSessionShortCountLabel,
} from '@psychotech/shared';
import { ArrowRight, ChevronRight } from 'lucide-angular';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { BadgesFacade } from '../../../badges/data-access/badges.facade';
import { BadgeArt } from '../../../badges/ui/badge-art';
import { CatalogFacade } from '../../../catalog/data-access/catalog.facade';
import { TrainingsOverviewFacade } from '../../../entrainements/data-access/trainings-overview.facade';
import {
  AxisRadar,
  AxisRadarEntry,
} from '../../../shared/ui/axis-radar/axis-radar';
import {
  AXIS_PRESENTATION,
  AxisPresentation,
} from '../../../shared/ui/axis-presentation';
import { AxisIcon } from '../../../shared/ui/axis-icon/axis-icon';
import { Icon } from '../../../shared/ui/icon/icon';
import { SECTOR_PRESENTATION } from '../../../shared/ui/sector-presentation';
import { SectorChip } from '../../../shared/ui/sector-chip/sector-chip';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import {
  formatNumericDate,
  formatNumericDayMonth,
} from '../../../shared/util/format-day-month-year';
import { formatFrenchDecimal } from '../../../shared/util/format-number';
import { countDaysSince } from '../../../shared/util/format-session-date';
import {
  buildSimulationResultRoute,
  buildTargetedResultRoute,
} from '../../../shared/util/session-links';
import { ProgressionFacade } from '../../data-access/progression.facade';
import { EvolutionChart } from '../../ui/evolution-chart/evolution-chart';
import {
  SparklineGeometry,
  buildSparklinePoints,
  computeAxisProgressDelta,
} from './axis-row-metrics';
import { buildProgressionBadgesView } from './progression-badges-view';

const SPARKLINE_GEOMETRY: SparklineGeometry = {
  width: 140,
  top: 3,
  bottom: 25,
};

type DeltaTone = 'up' | 'down' | 'flat';

interface AxisDeltaView {
  label: string;
  tone: DeltaTone;
}

interface AxisRowView {
  axis: AxisType;
  presentation: AxisPresentation;
  neverPlayed: boolean;
  bestScore: number | null;
  sparklinePoints: string | null;
  delta: AxisDeltaView | null;
  clickable: boolean;
}

function formatRelativeDay(iso: string): string {
  const days = countDaysSince(iso);
  if (days === 0) {
    return 'aujourd’hui';
  }
  if (days === 1) {
    return 'hier';
  }
  return `le ${formatNumericDayMonth(iso)}`;
}

function buildAxisDelta(delta: number | null): AxisDeltaView | null {
  if (delta === null) {
    return null;
  }
  if (delta > 0) {
    return { label: `+${delta}`, tone: 'up' };
  }
  if (delta < 0) {
    return { label: `−${Math.abs(delta)}`, tone: 'down' };
  }
  return { label: '0', tone: 'flat' };
}

@Component({
  selector: 'app-progression',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AxisIcon,
    AxisRadar,
    BadgeArt,
    EvolutionChart,
    Icon,
    RouterLink,
    SectorChip,
    Skeleton,
  ],
  providers: [ProgressionFacade, TrainingsOverviewFacade],
  templateUrl: './progression.html',
  styleUrl: './progression.css',
})
export class Progression {
  private readonly facade = inject(ProgressionFacade);
  private readonly authFacade = inject(AuthFacade);
  private readonly catalogFacade = inject(CatalogFacade);
  private readonly overviewFacade = inject(TrainingsOverviewFacade);
  private readonly badgeStatuses = inject(BadgesFacade).fetchStatuses();
  private readonly router = inject(Router);
  private readonly now = new Date();

  protected readonly chevronIcon = ChevronRight;
  protected readonly arrowIcon = ArrowRight;

  protected readonly sector =
    this.authFacade.currentUser()?.currentSector ?? Sector.RAILWAY;

  constructor() {
    this.catalogFacade.loadSectorReferential(this.sector);
    this.overviewFacade.loadOverview(this.sector);
  }

  protected readonly progression = this.facade.progression;
  protected readonly loaded = computed(() => this.progression() !== null);
  protected readonly skeletonRows = [0, 1, 2, 3, 4];

  protected readonly sectorLabel = SECTOR_PRESENTATION[this.sector].label;
  protected readonly fullSessionLabel = FULL_SESSION_LABEL;
  protected readonly fullSessionLabelLower = FULL_SESSION_LABEL_LOWER;
  protected readonly fullSessionLabelPluralLower =
    FULL_SESSION_LABEL_PLURAL_LOWER;
  protected readonly targetedSessionLabelPluralLower =
    TARGETED_SESSION_LABEL_PLURAL_LOWER;

  protected readonly threshold = computed(
    () => this.catalogFacade.sectorReferential()?.admissibilityThreshold ?? 70,
  );

  protected readonly subtitleDate = computed(() => {
    const first = this.progression()?.stats.firstSessionAt;
    return first ? formatNumericDate(first) : null;
  });

  protected readonly evolutionPoints = computed(
    () => this.progression()?.evolution ?? [],
  );

  protected readonly evolutionTruncated = computed(() => {
    const fullSessions = this.progression()?.stats.fullSessionsCount ?? 0;
    return fullSessions > this.evolutionPoints().length;
  });

  protected readonly lastSimulation = computed(() => {
    const evolution = this.evolutionPoints();
    const last = evolution[evolution.length - 1];
    return last
      ? {
          scoreLabel: formatFrenchDecimal(last.globalScore),
          dayLabel: formatRelativeDay(last.date),
        }
      : null;
  });

  protected readonly bestScore = computed(() => {
    const stats = this.progression()?.stats;
    return stats?.bestGlobalScore != null
      ? {
          scoreLabel: formatFrenchDecimal(stats.bestGlobalScore),
          dateLabel: stats.bestGlobalScoreAt
            ? formatNumericDayMonth(stats.bestGlobalScoreAt)
            : null,
        }
      : null;
  });

  protected readonly sinceFirst = computed(() => {
    const stats = this.progression()?.stats;
    const evolution = this.evolutionPoints();
    const last = evolution[evolution.length - 1];
    if (
      !stats ||
      stats.firstGlobalScore === null ||
      !last ||
      stats.fullSessionsCount < 2
    ) {
      return null;
    }
    const delta = roundToTenth(last.globalScore - stats.firstGlobalScore);
    return {
      deltaLabel: `${delta >= 0 ? '+' : '−'}${formatFrenchDecimal(Math.abs(delta))}`,
      positive: delta >= 0,
      fromLabel: formatFrenchDecimal(stats.firstGlobalScore),
      toLabel: formatFrenchDecimal(last.globalScore),
    };
  });

  protected readonly sessionCounts = computed(() => {
    const stats = this.progression()?.stats;
    if (!stats) {
      return null;
    }
    return {
      total: stats.completedSessions,
      full: stats.fullSessionsCount,
      fullLabel: fullSessionCountLabel(stats.fullSessionsCount),
      fullShortLabel: fullSessionShortCountLabel(stats.fullSessionsCount),
      targeted: stats.targetedSessionsCount,
      targetedLabel: targetedSessionShortCountLabel(
        stats.targetedSessionsCount,
      ),
    };
  });

  protected readonly axisRows = computed<AxisRowView[]>(() => {
    const axes = this.progression()?.axes ?? [];
    const overviewByAxis = new Map(
      (this.overviewFacade.overview()?.axes ?? []).map((axis) => [
        axis.axis,
        axis,
      ]),
    );
    return axes.map((axis) =>
      this.buildAxisRow(axis, overviewByAxis.get(axis.axis)),
    );
  });

  private buildAxisRow(
    axis: AxisProgressionDto,
    overview: TrainingsAxisOverviewDto | undefined,
  ): AxisRowView {
    const scores = axis.sparkline.map((point) => point.score);
    return {
      axis: axis.axis,
      presentation: AXIS_PRESENTATION[axis.axis],
      neverPlayed: overview?.neverPlayed ?? axis.currentScore === null,
      bestScore:
        overview?.bestScore == null ? null : Math.round(overview.bestScore),
      sparklinePoints: buildSparklinePoints(scores, SPARKLINE_GEOMETRY),
      delta: buildAxisDelta(
        computeAxisProgressDelta(
          axis.firstScore,
          axis.currentScore,
          scores.length,
        ),
      ),
      clickable: axis.lastSessionId !== null,
    };
  }

  protected readonly radarLast = computed<AxisRadarEntry[]>(() =>
    (this.progression()?.radar.last ?? [])
      .filter((entry) => entry.score !== null)
      .map((entry) => ({ axis: entry.axis, score: entry.score ?? 0 })),
  );

  protected readonly radarFirst = computed<AxisRadarEntry[]>(() => {
    if (this.progression()?.stats.fullSessionsCount === 1) {
      return [];
    }
    return (this.progression()?.radar.first ?? [])
      .filter((entry) => entry.score !== null)
      .map((entry) => ({ axis: entry.axis, score: entry.score ?? 0 }));
  });

  protected readonly radarFirstDate = computed(() => {
    const first = this.progression()?.stats.firstFullSessionAt;
    return first ? formatNumericDate(first) : null;
  });

  protected readonly radarLastDate = computed(() => {
    const evolution = this.evolutionPoints();
    const last = evolution[evolution.length - 1];
    return last ? formatNumericDate(last.date) : null;
  });

  protected readonly badges = computed(() => {
    const statuses = this.badgeStatuses();
    if (statuses === null) {
      return null;
    }
    const bestScores: Partial<Record<AxisType, number>> = {};
    for (const axis of this.overviewFacade.overview()?.axes ?? []) {
      if (axis.bestScore !== null) {
        bestScores[axis.axis] = axis.bestScore;
      }
    }
    return buildProgressionBadgesView(
      statuses,
      bestScores,
      this.sector,
      this.now,
    );
  });

  protected openSimulationResult(sessionId: string): void {
    this.router.navigate(buildSimulationResultRoute(sessionId));
  }

  protected openAxisLastResult(axis: AxisType): void {
    const row = (this.progression()?.axes ?? []).find(
      (entry) => entry.axis === axis,
    );
    if (!row || row.lastSessionId === null) {
      return;
    }
    if (row.lastSessionMode === SessionMode.TARGETED) {
      this.router.navigate(buildTargetedResultRoute(axis, row.lastSessionId));
      return;
    }
    this.router.navigate(buildSimulationResultRoute(row.lastSessionId));
  }
}
