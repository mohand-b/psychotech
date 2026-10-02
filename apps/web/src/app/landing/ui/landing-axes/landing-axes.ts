import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowRight } from 'lucide-angular';
import { Icon } from '../../../shared/ui/icon/icon';
import { LANDING_AXES } from '../../data/landing-axes';
import { LANDING_ROUTE } from '../../util/landing-link';
import { LANDING_SECTION } from '../../util/landing-sections';
import { twoDigitRank } from '../../util/two-digit-rank';
import {
  LANDING_AXIS_PANEL_ID,
  LandingAxisTabs,
  landingAxisTabId,
} from '../landing-axis-tabs/landing-axis-tabs';
import { LandingReveal } from '../landing-reveal.directive';
import { LandingScreenStack } from '../landing-screen-stack/landing-screen-stack';

const GUIDE_ARROW_SIZE = 15;

@Component({
  selector: 'app-landing-axes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Icon,
    LandingAxisTabs,
    LandingReveal,
    LandingScreenStack,
    RouterLink,
  ],
  templateUrl: './landing-axes.html',
  styleUrl: './landing-axes.css',
})
export class LandingAxes {
  protected readonly sectionId = LANDING_SECTION.axes;
  protected readonly axes = LANDING_AXES;
  protected readonly axisScreens = LANDING_AXES.map((axis) => axis.screen);
  protected readonly axisCount = twoDigitRank(LANDING_AXES.length);
  protected readonly guideRoute = LANDING_ROUTE.guide;
  protected readonly arrowIcon = ArrowRight;
  protected readonly arrowSize = GUIDE_ARROW_SIZE;
  protected readonly panelId = LANDING_AXIS_PANEL_ID;
  protected readonly selected = signal(0);
  protected readonly active = computed(() => this.axes[this.selected()]);
  protected readonly activeRank = computed(() =>
    twoDigitRank(this.selected() + 1),
  );
  protected readonly activeTabId = computed(() =>
    landingAxisTabId(this.active().axis),
  );
}
