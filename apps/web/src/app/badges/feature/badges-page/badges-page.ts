import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AxisIcon } from '../../../shared/ui/axis-icon/axis-icon';
import { AxisType, FULL_SESSION_LABEL, Sector } from '@psychotech/shared';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { TrainingsOverviewFacade } from '../../../entrainements/data-access/trainings-overview.facade';
import { BadgesFacade } from '../../data-access/badges.facade';
import { BadgeArt } from '../../ui/badge-art';
import { BadgeTierRow } from '../../ui/badge-tier-row';
import { BadgeTransverseRow } from '../../ui/badge-transverse-row';
import {
  BadgeBoardView,
  BadgeOutlook,
  buildBadgeBoard,
} from './badges-page-view';

@Component({
  selector: 'app-badges-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisIcon, BadgeArt, BadgeTierRow, BadgeTransverseRow, RouterLink],
  templateUrl: './badges-page.html',
  styleUrl: './badges-page.css',
  providers: [TrainingsOverviewFacade],
  host: { class: 'page-shell' },
})
export class BadgesPage {
  private readonly authFacade = inject(AuthFacade);
  private readonly overviewFacade = inject(TrainingsOverviewFacade);
  private readonly statuses = inject(BadgesFacade).fetchStatuses();

  protected readonly fullSessionLabel = FULL_SESSION_LABEL;

  private readonly sector = computed(
    () => this.authFacade.currentUser()?.currentSector ?? Sector.RAILWAY,
  );

  constructor() {
    this.overviewFacade.loadOverview(this.sector());
  }

  private readonly outlook = computed<BadgeOutlook>(() => {
    const overview = this.overviewFacade.overview();
    const bestScores: Partial<Record<AxisType, number>> = {};
    for (const axis of overview?.axes ?? []) {
      if (axis.bestScore !== null) {
        bestScores[axis.axis] = axis.bestScore;
      }
    }
    return {
      bestScores,
      lastExamScore: overview?.lastSimulation?.globalScore ?? null,
      examThreshold: overview?.lastSimulation?.sectorThreshold ?? null,
    };
  });

  protected readonly board = computed<BadgeBoardView>(() =>
    buildBadgeBoard(this.statuses() ?? [], this.sector(), this.outlook()),
  );
}
