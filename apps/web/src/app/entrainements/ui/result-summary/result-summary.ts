import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { AxisType, ScoreBand, Sector } from '@psychotech/shared';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { formatDayTime } from '../../../shared/ui/format-duration';
import { Icon } from '../../../shared/ui/icon/icon';
import {
  VERDICT_LABELS,
  resolveScoreRating,
} from '../../../shared/ui/score-rating';
import { SECTOR_PRESENTATION } from '../../../shared/ui/sector-presentation';

@Component({
  selector: 'ui-result-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './result-summary.html',
  styleUrl: './result-summary.css',
})
export class ResultSummary {
  readonly axis = input.required<AxisType>();
  readonly score = input.required<number>();
  readonly band = input.required<ScoreBand>();
  readonly previousScore = input.required<number | null>();
  readonly bestScore = input.required<number>();
  readonly isNewBest = input.required<boolean>();
  readonly isEqualBest = input.required<boolean>();
  readonly sector = input.required<Sector>();
  readonly completedAt = input.required<string>();

  protected readonly presentation = computed(
    () => AXIS_PRESENTATION[this.axis()],
  );

  protected readonly subtitle = computed(() => {
    const sector = SECTOR_PRESENTATION[this.sector()].label;
    return `Entraînement ciblé · ${sector} · ${formatDayTime(this.completedAt())}`;
  });

  protected readonly delta = computed(() => {
    const previous = this.previousScore();
    return previous === null ? null : this.score() - previous;
  });

  protected readonly verdictLabel = computed(() => VERDICT_LABELS[this.band()]);

  protected readonly verdictColor = computed(
    () => resolveScoreRating(this.score()).colorVar,
  );

  protected readonly bestSuffix = computed(() => {
    if (this.isNewBest()) {
      return " — record battu aujourd'hui";
    }
    return this.isEqualBest() ? " — record égalé aujourd'hui" : '';
  });
}
