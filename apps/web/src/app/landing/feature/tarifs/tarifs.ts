import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  ENERGY_PACKS,
  EnergyPackDefinition,
  EnergyPackId,
  SESSION_ENERGY_COST,
  SIGNUP_ENERGY_GRANT,
  SessionMode,
} from '@psychotech/shared';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { LandingCta } from '../../ui/landing-cta/landing-cta';
import { LandingFooter } from '../../ui/landing-footer/landing-footer';
import { LandingHeader } from '../../ui/landing-header/landing-header';
import { LandingReveal } from '../../ui/landing-reveal';
import { injectLandingChrome } from '../../util/landing-chrome';

interface PackView {
  title: string;
  credits: number;
  priceLabel: string;
  unitLabel: string;
  examCount: number;
  highlighted: boolean;
}

const HIGHLIGHTED_PACK = EnergyPackId.PRE_EXAM;

function formatCentsAsEuros(cents: number): string {
  const euros = Math.floor(cents / 100);
  const decimals = `${cents % 100}`.padStart(2, '0');
  return `${euros},${decimals}\u00A0€`;
}

function buildPackView(pack: EnergyPackDefinition): PackView {
  return {
    title: pack.title,
    credits: pack.energyAmount,
    priceLabel: formatCentsAsEuros(pack.priceCents),
    unitLabel: formatCentsAsEuros(
      Math.round(pack.priceCents / pack.energyAmount),
    ),
    examCount: Math.floor(
      pack.energyAmount / SESSION_ENERGY_COST[SessionMode.FULL],
    ),
    highlighted: pack.id === HIGHLIGHTED_PACK,
  };
}

@Component({
  selector: 'app-tarifs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LandingCta, LandingFooter, LandingHeader, LandingReveal],
  templateUrl: './tarifs.html',
  styleUrls: ['./tarifs.css', '../../landing-theme.css'],
})
export class Tarifs {
  protected readonly scrolled = injectLandingChrome();
  protected readonly authenticated = inject(AuthFacade).isAuthenticated;
  protected readonly packs: PackView[] = ENERGY_PACKS.map(buildPackView);
  protected readonly signupGrant = SIGNUP_ENERGY_GRANT;
}
