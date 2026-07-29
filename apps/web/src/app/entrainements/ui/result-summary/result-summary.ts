import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import {
  AxisType,
  SectorReferentialDto,
  Sector,
  buildAxisStamp,
} from '@psychotech/shared';
import { TriangleAlert } from 'lucide-angular';
import { CatalogFacade } from '../../../catalog/data-access/catalog.facade';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { AxisLabel } from '../../../shared/ui/axis-label/axis-label';
import { formatDayTime } from '../../../shared/ui/format-duration';
import { Icon } from '../../../shared/ui/icon/icon';
import { SECTOR_PRESENTATION } from '../../../shared/ui/sector-presentation';
import { StampBadge } from '../../../shared/ui/stamp-badge/stamp-badge';
import { ThresholdBar } from '../../../shared/ui/threshold-bar/threshold-bar';
import { formatFrenchDecimal } from '../../../shared/util/format-number';

export interface AxisThresholdView {
  value: number;
  isCritical: boolean;
  desktopLabel: string;
  mobileLabel: string;
}

export interface AxisGapView {
  above: boolean;
  label: string;
}

@Component({
  selector: 'ui-result-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisLabel, Icon, StampBadge, ThresholdBar],
  templateUrl: './result-summary.html',
  styleUrl: './result-summary.css',
})
export class ResultSummary {
  private readonly catalogFacade = inject(CatalogFacade);

  readonly axis = input.required<AxisType>();
  readonly score = input.required<number>();
  readonly previousBestScore = input.required<number | null>();
  readonly bestScore = input.required<number>();
  readonly isNewBest = input.required<boolean>();
  readonly isEqualBest = input.required<boolean>();
  readonly sector = input.required<Sector>();
  readonly completedAt = input.required<string>();
  readonly recordVisible = input(true);

  protected readonly alertIcon = TriangleAlert;

  protected readonly presentation = computed(
    () => AXIS_PRESENTATION[this.axis()],
  );

  protected readonly subtitle = computed(() => {
    const sector = SECTOR_PRESENTATION[this.sector()].label;
    return `Entraînement ciblé · ${sector} · ${formatDayTime(this.completedAt())}`;
  });

  protected readonly delta = computed(() => {
    const previous = this.previousBestScore();
    return previous === null ? null : this.score() - previous;
  });

  private readonly referential = computed(() =>
    this.catalogFacade.sectorReferential(),
  );

  private readonly axisEntry = computed(() =>
    this.referential()?.axes.find((entry) => entry.code === this.axis()),
  );

  protected readonly isCritical = computed(
    () => this.axisEntry()?.isCritical ?? false,
  );

  protected readonly stamp = computed(() => {
    const referential = this.referential();
    return buildAxisStamp(this.score(), {
      isCritical: this.isCritical(),
      eliminatoryThreshold: referential?.eliminatoryThreshold ?? 0,
    });
  });

  protected readonly isUnderEliminatory = computed(
    () => this.stamp().isEliminatory,
  );

  protected readonly threshold = computed<AxisThresholdView | null>(() => {
    const referential = this.referential();
    if (!referential) {
      return null;
    }
    return this.isCritical()
      ? criticalThreshold(referential)
      : vigilanceThreshold(referential);
  });

  protected readonly gap = computed<AxisGapView | null>(() => {
    const threshold = this.threshold();
    if (!threshold) {
      return null;
    }
    const value = Math.round((this.score() - threshold.value) * 10) / 10;
    const above = value >= 0;
    const formatted = formatFrenchDecimal(value);
    return {
      above,
      label: above ? `+${formatted} au-dessus` : `${formatted} en dessous`,
    };
  });

  protected readonly fillFrom = computed(() => this.presentation().textVar);
  protected readonly fillTo = computed(() => this.presentation().plainVar);

  constructor() {
    effect(() => this.catalogFacade.loadSectorReferential(this.sector()));
  }

  protected readonly bestSuffix = computed(() => {
    if (this.isNewBest()) {
      return ' - record battu avec cet entraînement';
    }
    return this.isEqualBest() ? ' - record égalé avec cet entraînement' : '';
  });
}

function criticalThreshold(
  referential: SectorReferentialDto,
): AxisThresholdView {
  return {
    value: referential.eliminatoryThreshold,
    isCritical: true,
    desktopLabel: 'Axe critique, seuil éliminatoire',
    mobileLabel: 'Seuil éliminatoire',
  };
}

function vigilanceThreshold(
  referential: SectorReferentialDto,
): AxisThresholdView {
  return {
    value: referential.vigilanceThreshold,
    isCritical: false,
    desktopLabel: 'Seuil de vigilance',
    mobileLabel: 'Seuil de vigilance',
  };
}
