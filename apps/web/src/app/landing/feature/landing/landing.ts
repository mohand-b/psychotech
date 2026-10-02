import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { injectLandingChrome } from '../../util/landing-chrome';
import { LandingAxes } from '../../ui/landing-axes/landing-axes';
import { LandingCta } from '../../ui/landing-cta/landing-cta';
import { LandingEnjeu } from '../../ui/landing-enjeu/landing-enjeu';
import { LandingEnterprise } from '../../ui/landing-enterprise/landing-enterprise';
import { LandingFaq } from '../../ui/landing-faq/landing-faq';
import { LandingFooter } from '../../ui/landing-footer/landing-footer';
import { LandingHeader } from '../../ui/landing-header/landing-header';
import { LandingHero } from '../../ui/landing-hero/landing-hero';
import { LandingSectors } from '../../ui/landing-sectors/landing-sectors';
import { LandingStory } from '../../ui/landing-story/landing-story';

@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LandingAxes,
    LandingCta,
    LandingEnjeu,
    LandingEnterprise,
    LandingFaq,
    LandingFooter,
    LandingHeader,
    LandingHero,
    LandingSectors,
    LandingStory,
  ],
  templateUrl: './landing.html',
  styleUrls: ['./landing.css', '../../landing-theme.css'],
})
export class Landing {
  protected readonly scrolled = injectLandingChrome();
  protected readonly authenticated = inject(AuthFacade).isAuthenticated;
}
