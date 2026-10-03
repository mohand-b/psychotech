import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AXIS_META,
  AxisType,
  FULL_SESSION_AXIS_ORDER,
  GuideId,
  SECTOR_AXES,
  Sector,
} from '@psychotech/shared';
import {
  ArrowRight,
  ChevronLeft,
  ClipboardCheck,
  ShieldCheck,
} from 'lucide-angular';
import { switchMap } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { BadgesFacade } from '../../../badges/data-access/badges.facade';
import { AxisIcon } from '../../../shared/ui/axis-icon/axis-icon';
import {
  AXIS_PRESENTATION,
  AxisPresentation,
} from '../../../shared/ui/axis-presentation';
import { Icon } from '../../../shared/ui/icon/icon';
import {
  SECTOR_LINEUP,
  SectorLineupEntry,
} from '../../../shared/ui/sector-presentation';
import { GuideReadCheck } from '../../ui/guide-read-check/guide-read-check';
import { GuideScrollTop } from '../guide-scroll-top/guide-scroll-top';
import { SmoothAnchors } from '../../ui/smooth-anchors';
import {
  GUIDE_AXIS_ANCHORS,
  GUIDE_LOGIC_RULES_PATH,
  GUIDE_SCORE_ANCHOR,
} from '../../../shared/util/guide-anchors';
import { navigateBack } from '../../util/guide-back';

interface GuideAnchorChip {
  axis: AxisType;
  anchor: string;
  presentation: AxisPresentation;
}

interface GuideUpcomingAxis {
  axis: AxisType;
  presentation: AxisPresentation;
}

interface GuideSectorTableRow {
  axis: AxisType;
  presentation: AxisPresentation;
  upcoming: boolean;
  memberships: boolean[];
}

interface GuideSectorStackEntry {
  column: SectorLineupEntry;
  current: boolean;
  axes: GuideUpcomingAxis[];
}

const UPCOMING_AXES_ORDER: readonly AxisType[] = [
  AxisType.ATTENTION,
  AxisType.NUMERICAL,
  AxisType.SPATIAL,
  AxisType.VERBAL,
];

const CHIP_AXES_ORDER: readonly AxisType[] = [
  ...FULL_SESSION_AXIS_ORDER,
  ...UPCOMING_AXES_ORDER,
];

const FRENCH_COLLATOR = new Intl.Collator('fr');

function compareByFrenchLabel(
  a: AxisPresentation,
  b: AxisPresentation,
): number {
  return FRENCH_COLLATOR.compare(a.label, b.label);
}

@Component({
  selector: 'app-guide-hub',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisIcon, GuideReadCheck, GuideScrollTop, Icon, RouterLink],
  hostDirectives: [SmoothAnchors],
  templateUrl: './guide-hub.html',
  styleUrls: ['../guide-shared.css', './guide-hub.css'],
})
export class GuideHub {
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly authFacade = inject(AuthFacade);
  private readonly badgesFacade = inject(BadgesFacade);

  private readonly locallyMarked = signal(false);
  protected readonly guideRead = computed(
    () =>
      this.locallyMarked() ||
      this.authFacade.currentUser()?.examGuideReadAt != null,
  );

  protected readonly AxisType = AxisType;
  protected readonly backIcon = ChevronLeft;
  protected readonly arrowIcon = ArrowRight;
  protected readonly realExamIcon = ClipboardCheck;
  protected readonly honestyIcon = ShieldCheck;
  protected readonly logicRulesPath = GUIDE_LOGIC_RULES_PATH;
  protected readonly scoreAnchor = GUIDE_SCORE_ANCHOR;
  protected readonly anchors = GUIDE_AXIS_ANCHORS;

  protected readonly axisChips: readonly GuideAnchorChip[] =
    CHIP_AXES_ORDER.map((axis) => ({
      axis,
      anchor: GUIDE_AXIS_ANCHORS[axis],
      presentation: AXIS_PRESENTATION[axis],
    }));

  protected readonly upcomingAxes: readonly GuideUpcomingAxis[] =
    UPCOMING_AXES_ORDER.map((axis) => ({
      axis,
      presentation: AXIS_PRESENTATION[axis],
    }));

  protected readonly sectorColumns = SECTOR_LINEUP;

  protected readonly sectorTableRows: readonly GuideSectorTableRow[] = (
    Object.values(AxisType) as AxisType[]
  )
    .map((axis) => ({
      axis,
      presentation: AXIS_PRESENTATION[axis],
      upcoming: !AXIS_META[axis].playable,
      memberships: SECTOR_LINEUP.map(({ sector }) =>
        SECTOR_AXES[sector].includes(axis),
      ),
    }))
    .sort((a, b) => compareByFrenchLabel(a.presentation, b.presentation));

  protected navigateToPreviousPage(): void {
    navigateBack(this.location, this.router, '/entrainements');
  }

  protected markGuideRead(): void {
    this.locallyMarked.set(true);
    this.badgesFacade
      .markGuideRead(GuideId.EXAM_GUIDE)
      .pipe(switchMap(() => this.authFacade.loadCurrentUser()))
      .subscribe({ error: () => undefined });
  }

  protected readonly sectorStack: readonly GuideSectorStackEntry[] =
    SECTOR_LINEUP.map((column) => ({
      column,
      current: column.sector === Sector.RAILWAY,
      axes: SECTOR_AXES[column.sector]
        .map((axis) => ({ axis, presentation: AXIS_PRESENTATION[axis] }))
        .sort((a, b) => compareByFrenchLabel(a.presentation, b.presentation)),
    }));
}
