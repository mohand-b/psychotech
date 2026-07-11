import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AxisType,
  SimulationSummaryDto,
  SimulationThresholdKind,
  SimulationWeaknessDto,
  TargetedAxisResultDto,
} from '@psychotech/shared';
import { Info } from 'lucide-angular';
import { ResultActions } from '../../../entrainements/ui/result-actions/result-actions';
import { SimulationSummaryFacade } from '../../data-access/simulation-summary.facade';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { AxisChip } from '../../../shared/ui/axis-chip/axis-chip';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import {
  BAND_COLOR_VARS,
  BAND_LABELS,
} from '../../../shared/ui/score-rating';
import { SECTOR_PRESENTATION } from '../../../shared/ui/sector-presentation';
import { axisSlug } from '../../../shared/util/axis-slug';
import { AxisRadar, AxisRadarEntry } from '../../ui/axis-radar/axis-radar';
import { SimulationAxisDetail } from '../../ui/simulation-axis-detail/simulation-axis-detail';
import { ThresholdGauge } from '../../ui/threshold-gauge/threshold-gauge';
import { formatSessionDate } from '../sessions/session-history-view';

function frenchDecimal(value: number): string {
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

@Component({
  selector: 'app-simulation-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AxisChip,
    AxisRadar,
    Button,
    Icon,
    ResultActions,
    SimulationAxisDetail,
    ThresholdGauge,
  ],
  templateUrl: './simulation-summary.html',
  styleUrl: './simulation-summary.css',
})
export class SimulationSummary {
  private readonly facade = inject(SimulationSummaryFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly sessionId =
    this.route.snapshot.paramMap.get('sessionId') ?? '';

  protected readonly infoIcon = Info;
  protected readonly bandColorVars = BAND_COLOR_VARS;

  protected readonly summary = signal<SimulationSummaryDto | null>(null);
  protected readonly openAxis = signal<AxisType | null>(null);
  protected readonly loadingAxis = signal<AxisType | null>(null);
  protected readonly details = signal<
    Partial<Record<AxisType, TargetedAxisResultDto>>
  >({});

  constructor() {
    this.facade.loadSummary(this.sessionId).subscribe({
      next: (summary) => this.summary.set(summary),
      error: () => this.router.navigate(['/sessions']),
    });
  }

  protected readonly contextLabel = computed(() => {
    const summary = this.summary();
    if (!summary) {
      return '';
    }
    const sectorLabel = SECTOR_PRESENTATION[summary.sector].label;
    const dateLabel = formatSessionDate(
      summary.completedAt,
      new Date(),
    ).replace(' · ', ', ');
    return `Simulation complète · ${sectorLabel} · ${dateLabel}`;
  });

  protected readonly scoreLabel = computed(() => {
    const summary = this.summary();
    return summary ? frenchDecimal(summary.globalScore) : '';
  });

  protected readonly verdict = computed(() => {
    const summary = this.summary();
    if (!summary) {
      return null;
    }
    if (summary.isEliminated) {
      return { label: 'Défavorable', colorVar: 'var(--rating-bad)' };
    }
    return {
      label: BAND_LABELS[summary.globalBand],
      colorVar: BAND_COLOR_VARS[summary.globalBand],
    };
  });

  protected readonly thresholdCaption = computed(() => {
    const summary = this.summary();
    return summary
      ? `Seuil d'admissibilité ${SECTOR_PRESENTATION[summary.sector].label} :`
      : '';
  });

  protected readonly gap = computed(() => {
    const summary = this.summary();
    if (!summary) {
      return null;
    }
    const above = summary.admissibilityGap >= 0;
    const label = above
      ? `+${frenchDecimal(summary.admissibilityGap)} au-dessus`
      : `${frenchDecimal(summary.admissibilityGap)} en dessous`;
    return { above, label };
  });

  protected readonly eliminatoryLine = computed(() => {
    const summary = this.summary();
    if (!summary || !summary.isEliminated) {
      return null;
    }
    const labels = summary.eliminatoryAxes
      .map((axis) => AXIS_PRESENTATION[axis].label)
      .join(', ');
    return `Un axe sous son seuil éliminatoire rend l'avis défavorable quel que soit le score global : ${labels}.`;
  });

  protected readonly radarEntries = computed<AxisRadarEntry[]>(() => {
    const summary = this.summary();
    return summary
      ? summary.axes.map(({ axis, score }) => ({ axis, score }))
      : [];
  });

  protected isEliminatoryAxis(axis: AxisType): boolean {
    return this.summary()?.eliminatoryAxes.includes(axis) ?? false;
  }

  protected weaknessMention(weakness: SimulationWeaknessDto): string {
    return weakness.thresholdKind === SimulationThresholdKind.ELIMINATORY
      ? `Sous le seuil éliminatoire : ${weakness.thresholdValue}`
      : `Sous le seuil de vigilance : ${weakness.thresholdValue}`;
  }

  protected toggle(axis: AxisType): void {
    if (this.openAxis() === axis) {
      this.openAxis.set(null);
      return;
    }
    this.openAxis.set(axis);
    if (this.details()[axis] || this.loadingAxis() === axis) {
      return;
    }
    this.loadingAxis.set(axis);
    this.facade.loadAxisDetail(this.sessionId, axis).subscribe({
      next: (detail) => {
        this.details.update((current) => ({ ...current, [axis]: detail }));
        if (this.loadingAxis() === axis) {
          this.loadingAxis.set(null);
        }
      },
      error: () => {
        if (this.loadingAxis() === axis) {
          this.loadingAxis.set(null);
        }
      },
    });
  }

  protected trainAxis(axis: AxisType): void {
    this.router.navigate(['/entrainements/cible', axisSlug(axis)]);
  }

  protected newTraining(): void {
    this.router.navigate(['/entrainements/simulation']);
  }

  protected back(): void {
    this.router.navigate(['/entrainements']);
  }
}
