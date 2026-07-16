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
  Sector,
  SessionMode,
} from '@psychotech/shared';
import { ChevronRight } from 'lucide-angular';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { CatalogFacade } from '../../../catalog/data-access/catalog.facade';
import { AxisRadarEntry } from '../../../sessions/ui/axis-radar/axis-radar';
import { AxisRadar } from '../../../sessions/ui/axis-radar/axis-radar';
import {
  AXIS_PRESENTATION,
  AxisPresentation,
} from '../../../shared/ui/axis-presentation';
import { BAND_COLOR_VARS } from '../../../shared/ui/score-rating';
import { Icon } from '../../../shared/ui/icon/icon';
import { SECTOR_PRESENTATION } from '../../../shared/ui/sector-presentation';
import { axisSlug } from '../../../shared/util/axis-slug';
import { formatSessionDate } from '../../../shared/util/format-session-date';
import { ProgressionFacade } from '../../data-access/progression.facade';
import { EvolutionChart } from '../../ui/evolution-chart/evolution-chart';

const EVOLUTION_DISPLAY_LIMIT = 10;
const SPARKLINE_WIDTH = 140;
const SPARKLINE_TOP = 4;
const SPARKLINE_BOTTOM = 24;

interface AxisRowView {
  axis: AxisType;
  presentation: AxisPresentation;
  tag: string | null;
  tagColorVar: string;
  score: number | null;
  deltaLabel: string | null;
  deltaPositive: boolean;
  sparklinePoints: string | null;
  clickable: boolean;
}

function formatGlobalScore(value: number): string {
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatDayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  });
}

function relativeDayLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const dayMs = 86_400_000;
  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diff = Math.round((startOfDay(now) - startOfDay(date)) / dayMs);
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
  imports: [AxisRadar, EvolutionChart, Icon],
  providers: [ProgressionFacade],
  templateUrl: './progression.html',
  styleUrl: './progression.css',
})
export class Progression {
  private readonly facade = inject(ProgressionFacade);
  private readonly authFacade = inject(AuthFacade);
  private readonly catalogFacade = inject(CatalogFacade);
  private readonly router = inject(Router);
  private readonly now = new Date();

  protected readonly chevronIcon = ChevronRight;

  private readonly sector =
    this.authFacade.currentUser()?.currentSector ?? Sector.RAILWAY;

  constructor() {
    this.catalogFacade.loadSectorReferential(this.sector);
  }

  protected readonly progression = this.facade.progression;
  protected readonly loaded = computed(() => this.progression() !== null);

  protected readonly sectorLabel = SECTOR_PRESENTATION[this.sector].label;

  protected readonly threshold = computed(
    () =>
      this.catalogFacade.sectorReferential()?.admissibilityThreshold ?? 70,
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
          scoreLabel: formatGlobalScore(last.globalScore),
          bandColorVar: BAND_COLOR_VARS[last.band],
          dateLabel: formatSessionDate(last.date, this.now),
        }
      : null;
  });

  protected readonly bestScore = computed(() => {
    const stats = this.progression()?.stats;
    return stats?.bestGlobalScore != null
      ? {
          scoreLabel: formatGlobalScore(stats.bestGlobalScore),
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
    const delta =
      Math.round((last.globalScore - stats.firstGlobalScore) * 10) / 10;
    return {
      deltaLabel: `${delta >= 0 ? '+' : '−'}${formatGlobalScore(Math.abs(delta))}`,
      positive: delta >= 0,
      fromLabel: formatGlobalScore(stats.firstGlobalScore),
      toLabel: formatGlobalScore(last.globalScore),
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

  protected readonly axisRows = computed<AxisRowView[]>(() => {
    const axes = this.progression()?.axes ?? [];
    const critical = new Set(
      (this.catalogFacade.sectorReferential()?.axes ?? [])
        .filter((axis) => axis.isCritical)
        .map((axis) => axis.code),
    );
    const played = axes.filter((axis) => axis.currentScore !== null);
    const weakest =
      played.length >= 2
        ? [...played].sort(
            (a, b) => (a.currentScore ?? 0) - (b.currentScore ?? 0),
          )[0]
        : null;
    const strongest =
      played.length >= 2
        ? [...played].sort(
            (a, b) => (b.currentScore ?? 0) - (a.currentScore ?? 0),
          )[0]
        : null;
    return axes.map((axis) => this.buildRow(axis, critical, weakest, strongest));
  });

  private buildRow(
    axis: AxisProgressionDto,
    critical: Set<AxisType>,
    weakest: AxisProgressionDto | null,
    strongest: AxisProgressionDto | null,
  ): AxisRowView {
    const delta =
      axis.deltaOver30Days === null ? null : Math.round(axis.deltaOver30Days);
    const tag =
      axis.currentScore === null
        ? 'Pas encore joué'
        : axis.axis === weakest?.axis
          ? 'À travailler en priorité'
          : critical.has(axis.axis)
            ? `Axe critique du ${this.sectorLabel.toLowerCase()}`
            : axis.axis === strongest?.axis
              ? 'Votre point fort'
              : null;
    return {
      axis: axis.axis,
      presentation: AXIS_PRESENTATION[axis.axis],
      tag,
      tagColorVar:
        tag === 'Votre point fort'
          ? 'var(--success-text)'
          : tag === 'Pas encore joué'
            ? 'var(--label)'
            : 'var(--warning-text)',
      score: axis.currentScore === null ? null : Math.round(axis.currentScore),
      deltaLabel:
        delta === null ? null : `${delta >= 0 ? '+' : '−'}${Math.abs(delta)}`,
      deltaPositive: delta !== null && delta >= 0,
      sparklinePoints: this.sparklineFor(axis),
      clickable: axis.lastSessionId !== null,
    };
  }

  private sparklineFor(axis: AxisProgressionDto): string | null {
    const scores = axis.sparkline.map((point) => point.score);
    if (scores.length < 2) {
      return null;
    }
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const range = max - min || 1;
    return scores
      .map((score, index) => {
        const x =
          Math.round(((index * SPARKLINE_WIDTH) / (scores.length - 1)) * 10) /
          10;
        const y =
          Math.round(
            (SPARKLINE_TOP +
              ((max - score) / range) * (SPARKLINE_BOTTOM - SPARKLINE_TOP)) *
              10,
          ) / 10;
        return `${x},${y}`;
      })
      .join(' ');
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
