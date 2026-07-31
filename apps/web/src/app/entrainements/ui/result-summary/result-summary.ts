import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  input,
} from '@angular/core';
import {
  AxisType,
  SectorReferentialDto,
  Sector,
  ELIMINATORY_AXIS_VERDICT_NOTE,
  TARGETED_SESSION_LABEL,
  buildAxisStamp,
  roundToTenth,
} from '@psychotech/shared';
import { TriangleAlert } from 'lucide-angular';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { AxisLabel } from '../../../shared/ui/axis-label/axis-label';
import { Icon } from '../../../shared/ui/icon/icon';
import { SECTOR_PRESENTATION } from '../../../shared/ui/sector-presentation';
import { StampBadge } from '../../../shared/ui/stamp-badge/stamp-badge';
import { ScoreReveal } from '../../../shared/ui/score-reveal/score-reveal';
import { ThresholdBar } from '../../../shared/ui/threshold-bar/threshold-bar';
import { formatFrenchDecimal } from '../../../shared/util/format-number';
import { formatSessionDate } from '../../../shared/util/format-session-date';

interface AxisThresholdView {
  value: number;
  isCritical: boolean;
  desktopLabel: string;
  mobileLabel: string;
}

interface AxisGapView {
  above: boolean;
  label: string;
}

@Component({
  selector: 'ui-result-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisLabel, Icon, StampBadge, ThresholdBar],
  providers: [ScoreReveal],
  templateUrl: './result-summary.html',
  styleUrl: './result-summary.css',
})
export class ResultSummary {
  private readonly reveal = inject(ScoreReveal);

  protected readonly revealedScore = this.reveal.value;
  protected readonly stampVisible = this.reveal.stampVisible;
  protected readonly stampStrike = this.reveal.stampStrike;

  protected readonly displayedScore = computed(() =>
    Math.round(this.reveal.value()),
  );

  readonly axis = input.required<AxisType>();
  readonly score = input.required<number>();
  readonly previousBestScore = input.required<number | null>();
  readonly bestScore = input.required<number>();
  readonly isNewBest = input.required<boolean>();
  readonly isEqualBest = input.required<boolean>();
  readonly sector = input.required<Sector>();
  readonly completedAt = input.required<string>();
  readonly recordVisible = input(true);
  readonly referential = input.required<SectorReferentialDto | null>();

  protected readonly alertIcon = TriangleAlert;
  protected readonly eliminatoryNote = ELIMINATORY_AXIS_VERDICT_NOTE;

  protected readonly presentation = computed(
    () => AXIS_PRESENTATION[this.axis()],
  );

  protected readonly subtitle = computed(() => {
    const sector = SECTOR_PRESENTATION[this.sector()].label;
    return `${TARGETED_SESSION_LABEL} · ${sector} · ${formatSessionDate(
      this.completedAt(),
      new Date(),
    )}`;
  });

  protected readonly delta = computed(() => {
    const previous = this.previousBestScore();
    return previous === null ? null : this.score() - previous;
  });

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
    const value = roundToTenth(this.score() - threshold.value);
    const above = value >= 0;
    const formatted = formatFrenchDecimal(value);
    return {
      above,
      label: above ? `+${formatted} au-dessus` : `${formatted} en dessous`,
    };
  });

  protected readonly fillFrom = computed(() => this.presentation().plainVar);
  protected readonly fillTo = computed(() => this.presentation().textVar);

  constructor() {
    afterNextRender(() => this.reveal.start(this.score()));
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
