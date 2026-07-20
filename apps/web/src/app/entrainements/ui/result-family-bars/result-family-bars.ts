import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  LOGIC_FAMILY_LABELS,
  LogicFamilyResultDto,
  LogicFamilyResultMarker,
} from '@psychotech/shared';
import { formatDuration } from '../../../shared/ui/format-duration';
import { resolveScoreRating } from '../../../shared/ui/score-rating';

const MARKER_LABELS: Record<LogicFamilyResultMarker, string> = {
  STRENGTH: 'Votre force',
  WEAKNESS: 'À travailler',
};

interface FamilyBarRow {
  label: string;
  markerLabel: string | null;
  isStrength: boolean;
  correct: number;
  total: number;
  ratePct: number;
  rateColorVar: string;
  time: string;
}

@Component({
  selector: 'ui-result-family-bars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './result-family-bars.html',
  styleUrl: './result-family-bars.css',
})
export class ResultFamilyBars {
  readonly families = input.required<LogicFamilyResultDto[]>();

  protected readonly rows = computed<FamilyBarRow[]>(() =>
    this.families().map((family) => ({
      label: LOGIC_FAMILY_LABELS[family.family],
      markerLabel: family.marker ? MARKER_LABELS[family.marker] : null,
      isStrength: family.marker === 'STRENGTH',
      correct: family.correct,
      total: family.total,
      ratePct: family.ratePct,
      rateColorVar: resolveScoreRating(family.ratePct).colorVar,
      time: formatDuration(Math.round(family.timeMs / 1000)),
    })),
  );
}
