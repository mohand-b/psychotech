import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  AxisProgressionDto,
  AxisType,
  FULL_SESSION_LABEL,
  FULL_SESSION_LABEL_LOWER,
  FULL_SESSION_LABEL_PLURAL_LOWER,
  Sector,
  SessionMode,
  TrainingsAxisOverviewDto,
  fullSessionCountLabel,
  roundToTenth,
} from '@psychotech/shared';
import { ChevronRight } from 'lucide-angular';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
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
import { axisSlug } from '../../../shared/util/axis-slug';
import { formatDayMonth } from '../../../shared/util/format-day-month-year';
import { formatFrenchDecimal } from '../../../shared/util/format-number';
import {
  daysSince,
  formatSessionDate,
} from '../../../shared/util/format-session-date';
import { ProgressionFacade } from '../../data-access/progression.facade';
import { EvolutionChart } from '../../ui/evolution-chart/evolution-chart';
import {
  AxisTrendDirection,
  SparklineGeometry,
  axisScoresWithinWindow,
  axisTrend,
  sparklinePoints,
  sparklineY,
} from './axis-row-metrics';

const EVOLUTION_DISPLAY_LIMIT = 10;
const SPARKLINE_GEOMETRY: SparklineGeometry = {
  width: 140,
  top: 4,
  bottom: 24,
};

interface AxisRowView {
  axis: AxisType;
  presentation: AxisPresentation;
  critical: boolean;
  needsWork: boolean;
  neverPlayed: boolean;
  bestScore: number | null;
  lastScore: number | null;
  trend: AxisTrendDirection | null;
  sparklinePoints: string | null;
  clickable: boolean;
}

function relativeDayLabel(iso: string): string {
  const diff = daysSince(iso);
  if (diff === 0) {
    return "aujourd'hui";
  }
  if (diff === 1) {
    return 'hier';
  }
  return `le ${formatDayMonth(iso)}`;
}

@Component({
  selector: 'app-progression',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisIcon, AxisRadar, EvolutionChart, Icon, SectorChip, Skeleton],
  providers: [ProgressionFacade, TrainingsOverviewFacade],
  templateUrl: './progression.html',
  styleUrl: './progression.css',
})
export class Progression {
  private readonly facade = inject(ProgressionFacade);
  private readonly authFacade = inject(AuthFacade);
  private readonly catalogFacade = inject(CatalogFacade);
  private readonly overviewFacade = inject(TrainingsOverviewFacade);
  private readonly router = inject(Router);
  private readonly now = new Date();

  protected readonly chevronIcon = ChevronRight;

  protected readonly sector =
    this.authFacade.currentUser()?.currentSector ?? Sector.RAILWAY;

  constructor() {
    this.catalogFacade.loadSectorReferential(this.sector);
    this.overviewFacade.load(this.sector);
  }

  protected readonly progression = this.facade.progression;
  protected readonly loaded = computed(() => this.progression() !== null);
  protected readonly skeletonKpis = [0, 1, 2, 3];

  protected readonly sectorLabel = SECTOR_PRESENTATION[this.sector].label;
  protected readonly fullSessionLabel = FULL_SESSION_LABEL;
  protected readonly fullSessionLabelLower = FULL_SESSION_LABEL_LOWER;
  protected readonly fullSessionLabelPluralLower =
    FULL_SESSION_LABEL_PLURAL_LOWER;
  protected readonly fullSessionCountLabel = fullSessionCountLabel;

  protected readonly threshold = computed(
    () => this.catalogFacade.sectorReferential()?.admissibilityThreshold ?? 70,
  );

  protected readonly subtitleDate = computed(() => {
    const first = this.progression()?.stats.firstSessionAt;
    return first ? formatDayMonth(first) : null;
  });

  protected readonly lastSimulation = computed(() => {
    const evolution = this.progression()?.evolution ?? [];
    const last = evolution[evolution.length - 1];
    return last
      ? {
          scoreLabel: formatFrenchDecimal(last.globalScore),
          dateLabel: formatSessionDate(last.date, this.now),
        }
      : null;
  });

  protected readonly bestScore = computed(() => {
    const stats = this.progression()?.stats;
    return stats?.bestGlobalScore != null
      ? {
          scoreLabel: formatFrenchDecimal(stats.bestGlobalScore),
          dateLabel: stats.bestGlobalScoreAt
            ? formatDayMonth(stats.bestGlobalScoreAt)
            : null,
        }
      : null;
  });

  protected readonly sinceFirst = computed(() => {
    const stats = this.progression()?.stats;
    const evolution = this.progression()?.evolution ?? [];
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
    return stats
      ? {
          total: stats.completedSessions,
          full: stats.fullSessionsCount,
          targeted: stats.targetedSessionsCount,
        }
      : null;
  });

  protected readonly evolutionPoints = computed(() => {
    const evolution = this.progression()?.evolution ?? [];
    return evolution.slice(-EVOLUTION_DISPLAY_LIMIT);
  });

  // La barre de seuil et les cinq courbes partagent la même géométrie : c'est
  // ce qui rend les lignes comparables entre elles.
  protected readonly sparklineThresholdY = computed(() =>
    sparklineY(this.threshold(), SPARKLINE_GEOMETRY),
  );

  protected trendArrow(trend: AxisTrendDirection): string {
    return trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→';
  }

  protected trendLabel(trend: AxisTrendDirection): string {
    return trend === 'up'
      ? 'En progression sur vos dernières sessions'
      : trend === 'down'
        ? 'En recul sur vos dernières sessions'
        : 'Stable sur vos dernières sessions';
  }

  protected readonly axisRows = computed<AxisRowView[]>(() => {
    const axes = this.progression()?.axes ?? [];
    const overviewByAxis = new Map(
      (this.overviewFacade.overview()?.axes ?? []).map((axis) => [
        axis.axis,
        axis,
      ]),
    );
    return axes.map((axis) => this.buildRow(axis, overviewByAxis.get(axis.axis)));
  });

  private buildRow(
    axis: AxisProgressionDto,
    overview: TrainingsAxisOverviewDto | undefined,
  ): AxisRowView {
    const scores = axisScoresWithinWindow(axis.sparkline, this.now);
    const neverPlayed = overview?.neverPlayed ?? axis.currentScore === null;
    return {
      axis: axis.axis,
      presentation: AXIS_PRESENTATION[axis.axis],
      critical: overview?.isCriticalAxis ?? false,
      needsWork: overview?.needsWork ?? false,
      neverPlayed,
      bestScore:
        overview?.bestScore == null ? null : Math.round(overview.bestScore),
      lastScore:
        axis.currentScore === null ? null : Math.round(axis.currentScore),
      trend: axisTrend(scores),
      sparklinePoints: sparklinePoints(scores, SPARKLINE_GEOMETRY),
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
    return first ? formatDayMonth(first) : null;
  });

  protected readonly radarLastDate = computed(() => {
    const evolution = this.progression()?.evolution ?? [];
    const last = evolution[evolution.length - 1];
    return last ? relativeDayLabel(last.date) : null;
  });

  protected readonly strongestGain = computed(() => {
    const radar = this.progression()?.radar;
    if (!radar || this.radarFirst().length === 0) {
      return null;
    }
    let best: { axis: AxisType; gain: number } | null = null;
    let allImproved = true;
    for (const last of radar.last) {
      const first = radar.first.find((entry) => entry.axis === last.axis);
      if (last.score === null || !first || first.score === null) {
        continue;
      }
      const gain = Math.round(last.score - first.score);
      if (gain < 0) {
        allImproved = false;
      }
      if (!best || gain > best.gain) {
        best = { axis: last.axis, gain };
      }
    }
    return best && best.gain > 0
      ? {
          label: AXIS_PRESENTATION[best.axis].label,
          gainLabel: `+${best.gain}`,
          allImproved,
        }
      : null;
  });

  protected openSession(sessionId: string): void {
    this.router.navigate(['/sessions', sessionId, 'resultat']);
  }

  protected openAxis(axis: AxisType): void {
    const row = (this.progression()?.axes ?? []).find(
      (entry) => entry.axis === axis,
    );
    if (!row || row.lastSessionId === null) {
      return;
    }
    if (row.lastSessionMode === SessionMode.TARGETED) {
      this.router.navigate([
        '/entrainements/cible',
        axisSlug(axis),
        'session',
        row.lastSessionId,
        'resultat',
      ]);
      return;
    }
    this.router.navigate(['/sessions', row.lastSessionId, 'resultat']);
  }
}
