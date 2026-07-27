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
  ScoreBand,
  Sector,
  buildAxisStamp,
} from '@psychotech/shared';
import { CatalogFacade } from '../../../catalog/data-access/catalog.facade';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { AxisLabel } from '../../../shared/ui/axis-label/axis-label';
import { formatDayTime } from '../../../shared/ui/format-duration';
import { SECTOR_PRESENTATION } from '../../../shared/ui/sector-presentation';
import { StampBadge } from '../../../shared/ui/stamp-badge/stamp-badge';

@Component({
  selector: 'ui-result-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisLabel, StampBadge],
  templateUrl: './result-summary.html',
  styleUrl: './result-summary.css',
})
export class ResultSummary {
  private readonly catalogFacade = inject(CatalogFacade);

  readonly axis = input.required<AxisType>();
  readonly score = input.required<number>();
  readonly band = input.required<ScoreBand>();
  readonly previousBestScore = input.required<number | null>();
  readonly bestScore = input.required<number>();
  readonly isNewBest = input.required<boolean>();
  readonly isEqualBest = input.required<boolean>();
  readonly sector = input.required<Sector>();
  readonly completedAt = input.required<string>();
  readonly recordVisible = input(true);

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

  protected readonly stamp = computed(() => {
    const referential = this.catalogFacade.sectorReferential();
    const entry = referential?.axes.find(
      (axisEntry) => axisEntry.code === this.axis(),
    );
    return buildAxisStamp(this.score(), {
      isCritical: entry?.isCritical ?? false,
      eliminatoryThreshold: referential?.eliminatoryThreshold ?? 0,
    });
  });

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
