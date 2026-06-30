import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AxisType, Sector, SectorAxisDto } from '@psychotech/shared';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { AxesFacade } from '../../../axes/data-access/axes.facade';
import { CatalogFacade } from '../../../catalog/data-access/catalog.facade';
import { AxisTrainingCard } from '../../ui/axis-training-card/axis-training-card';

const TARGETED_AXIS_COST = 1;
const BADGE_WEAK = 'À travailler';
const BADGE_CRITICAL = 'Axe critique';

interface AxisCardViewModel {
  axis: AxisType;
  description: string;
  bestScore: number | null;
  badge: string | null;
}

@Component({
  selector: 'app-axis-selection',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisTrainingCard],
  providers: [AxesFacade],
  templateUrl: './axis-selection.html',
  styleUrl: './axis-selection.css',
})
export class AxisSelection {
  private readonly authFacade = inject(AuthFacade);
  private readonly catalogFacade = inject(CatalogFacade);
  private readonly axesFacade = inject(AxesFacade);
  private readonly router = inject(Router);

  protected readonly cost = TARGETED_AXIS_COST;

  private readonly sector =
    this.authFacade.currentUser()?.currentSector ?? Sector.RAILWAY;
  private readonly referential = toSignal(
    this.catalogFacade.getSector(this.sector),
  );

  protected readonly axisCards = computed<AxisCardViewModel[]>(() => {
    const referential = this.referential();
    if (!referential) {
      return [];
    }
    const scoreByAxis = new Map(
      this.axesFacade.bestScores().map((best) => [best.axis, best.bestScore]),
    );
    const weakest = this.findWeakestAxis(referential.axes, scoreByAxis);
    return referential.axes.map((axis) => {
      const bestScore = scoreByAxis.get(axis.code) ?? null;
      return {
        axis: axis.code,
        description: axis.description,
        bestScore,
        badge: this.resolveBadge(
          axis,
          bestScore,
          weakest,
          referential.admissibilityThreshold,
        ),
      };
    });
  });

  protected startAxis(axis: AxisType): void {
    this.router.navigate(['/sessions'], { queryParams: { axis } });
  }

  private findWeakestAxis(
    axes: SectorAxisDto[],
    scoreByAxis: Map<AxisType, number>,
  ): SectorAxisDto | null {
    return axes.reduce<SectorAxisDto | null>((weakest, axis) => {
      const score = scoreByAxis.get(axis.code);
      if (score === undefined) {
        return weakest;
      }
      if (weakest === null) {
        return axis;
      }
      return score < (scoreByAxis.get(weakest.code) ?? Infinity)
        ? axis
        : weakest;
    }, null);
  }

  private resolveBadge(
    axis: SectorAxisDto,
    bestScore: number | null,
    weakest: SectorAxisDto | null,
    admissibilityThreshold: number,
  ): string | null {
    if (bestScore === null) {
      return null;
    }
    if (
      weakest !== null &&
      axis.code === weakest.code &&
      bestScore < admissibilityThreshold
    ) {
      return BADGE_WEAK;
    }
    if (axis.isCritical && bestScore <= admissibilityThreshold) {
      return BADGE_CRITICAL;
    }
    return null;
  }
}
