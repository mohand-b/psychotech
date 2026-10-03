import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { BADGE_TOTAL_REWARD, SIGNUP_ENERGY_GRANT } from '@psychotech/shared';
import { ArrowRight } from 'lucide-angular';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { AxisIcon } from '../../../shared/ui/axis-icon/axis-icon';
import { Icon } from '../../../shared/ui/icon/icon';
import {
  ENERGY_PACK_OFFERS,
  SESSION_CREDIT_COSTS,
} from '../../../shared/util/energy-pack-offer';
import { LandingButton } from '../../ui/landing-button/landing-button';
import { LandingFooter } from '../../ui/landing-footer/landing-footer';
import { LandingHeader } from '../../ui/landing-header/landing-header';
import { LandingReveal } from '../../ui/landing-reveal';
import { injectLandingChrome } from '../../util/landing-chrome';
import { LANDING_ROUTE, LandingLink } from '../../util/landing-link';

@Component({
  selector: 'app-tarifs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AxisIcon,
    Icon,
    LandingButton,
    LandingFooter,
    LandingHeader,
    LandingReveal,
    RouterLink,
  ],
  templateUrl: './tarifs.html',
  styleUrls: ['./tarifs.css', '../../landing-theme.css'],
})
export class Tarifs {
  protected readonly scrolled = injectLandingChrome();
  protected readonly authenticated = inject(AuthFacade).isAuthenticated;
  protected readonly packs = ENERGY_PACK_OFFERS;
  protected readonly sessionCosts = SESSION_CREDIT_COSTS;
  protected readonly signupGrant = SIGNUP_ENERGY_GRANT;
  protected readonly badgeReward = BADGE_TOTAL_REWARD;
  protected readonly arrowIcon = ArrowRight;
  protected readonly registerRoute = LANDING_ROUTE.register;

  protected readonly packLink = computed<LandingLink>(() => ({
    route: this.authenticated()
      ? LANDING_ROUTE.credits
      : LANDING_ROUTE.register,
  }));
}
