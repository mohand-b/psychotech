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
  buildSimulationStamp,
} from '@psychotech/shared';
import { Lightbulb, Play } from 'lucide-angular';
import { axisButtonColor } from '../../../entrainements/ui/axis-button-color';
import { SimulationSummaryFacade } from '../../data-access/simulation-summary.facade';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { AxisLabel } from '../../../shared/ui/axis-label/axis-label';
import { Button, ButtonColor } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { BAND_COLOR_VARS } from '../../../shared/ui/score-rating';
import { SECTOR_PRESENTATION } from '../../../shared/ui/sector-presentation';
import { StampBadge } from '../../../shared/ui/stamp-badge/stamp-badge';
import { ThresholdBar } from '../../../shared/ui/threshold-bar/threshold-bar';
import { axisSlug } from '../../../shared/util/axis-slug';
import { AxisRadar, AxisRadarEntry } from '../../../shared/ui/axis-radar/axis-radar';
import { SimulationAxisDetail } from '../../ui/simulation-axis-detail/simulation-axis-detail';
import { ThresholdGauge } from '../../ui/threshold-gauge/threshold-gauge';
import { formatFrenchDecimal } from '../../../shared/util/format-number';
import { formatSessionDate } from '../sessions/session-history-view';

@Component({
  selector: 'app-simulation-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AxisLabel,
    AxisRadar,
    Button,
    Icon,
    SimulationAxisDetail,
    StampBadge,
    ThresholdBar,
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

  protected readonly playIcon = Play;
  protected readonly markerIcon = Lightbulb;
  protected readonly bandColorVars = BAND_COLOR_VARS;
  protected readonly presentations = AXIS_PRESENTATION;

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

  protected readonly sectorLabel = computed(() => {
    const summary = this.summary();
    return summary ? SECTOR_PRESENTATION[summary.sector].label : '';
  });

  protected readonly contextPrefix = computed(() => {
    const summary = this.summary();
    if (!summary) {
      return '';
    }
    const dayLabel = formatSessionDate(summary.completedAt, new Date()).split(
      ' · ',
    )[0];
    return `Simulation complète · ${this.sectorLabel()} · ${dayLabel}, `;
  });

  protected readonly contextTime = computed(() => {
    const summary = this.summary();
    return summary
      ? new Date(summary.completedAt).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';
  });

  protected readonly scoreLabel = computed(() => {
    const summary = this.summary();
    return summary ? formatFrenchDecimal(summary.globalScore) : '';
  });

  protected readonly stamp = computed(() => {
    const summary = this.summary();
    if (!summary) {
      return null;
    }
    return buildSimulationStamp(
      summary.globalScore,
      summary.admissibilityThreshold,
      summary.isEliminated,
      summary.completedAt,
    );
  });

  protected readonly gap = computed(() => {
    const summary = this.summary();
    if (!summary) {
      return null;
    }
    const above = summary.admissibilityGap >= 0;
    const label = above
      ? `+${formatFrenchDecimal(summary.admissibilityGap)} au-dessus`
      : `${formatFrenchDecimal(summary.admissibilityGap)} en dessous`;
    return { above, label };
  });

  protected readonly radarEntries = computed<AxisRadarEntry[]>(() => {
    const summary = this.summary();
    return summary
      ? summary.axes.map(({ axis, score }) => ({ axis, score }))
      : [];
  });

  protected isUnderEliminatory(axis: AxisType): boolean {
    return this.summary()?.eliminatoryAxes.includes(axis) ?? false;
  }

  protected weaknessMention(weakness: SimulationWeaknessDto): string {
    return weakness.thresholdKind === SimulationThresholdKind.ELIMINATORY
      ? `Sous le seuil éliminatoire de l’axe : ${weakness.thresholdValue}`
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

  protected buttonColorFor(axis: AxisType): ButtonColor {
    return axisButtonColor(axis);
  }

  protected trainAxis(axis: AxisType): void {
    this.router.navigate(['/entrainements/cible', axisSlug(axis)]);
  }

  protected reviewAxis(axis: AxisType): void {
    this.router.navigate([
      '/entrainements/simulation/session',
      this.sessionId,
      'correction',
      axisSlug(axis),
    ]);
  }

  protected newTraining(): void {
    this.router.navigate(['/entrainements/simulation']);
  }

  protected back(): void {
    this.router.navigate(['/entrainements']);
  }
}
