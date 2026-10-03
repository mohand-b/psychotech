import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE_NAME } from '../../../core/seo/route-seo';
import { LANDING_ROUTE, LandingLink } from '../../util/landing-link';
import {
  LANDING_SECTION,
  LandingSectionId,
  buildLandingAnchorHref,
} from '../../util/landing-sections';
import { LandingButton } from '../landing-button/landing-button';

@Component({
  selector: 'app-landing-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LandingButton, RouterLink],
  templateUrl: './landing-header.html',
  styleUrl: './landing-header.css',
})
export class LandingHeader {
  readonly scrolled = input(false);
  readonly authenticated = input(false);
  readonly onLanding = input(true);

  protected readonly siteName = SITE_NAME;
  protected readonly section = LANDING_SECTION;
  protected readonly route = LANDING_ROUTE;
  protected readonly signupLink: LandingLink = {
    route: LANDING_ROUTE.register,
  };
  protected readonly dashboardLink: LandingLink = {
    route: LANDING_ROUTE.dashboard,
  };

  protected buildSectionHref(section: LandingSectionId): string {
    return buildLandingAnchorHref(section, this.onLanding());
  }
}
