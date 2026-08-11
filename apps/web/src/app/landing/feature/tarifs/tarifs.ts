import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
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
import { LandingReveal } from '../../ui/landing-reveal.directive';

interface PackView {
  title: string;
  credits: number;
  priceLabel: string;
  unitLabel: string;
  examCount: number;
  highlighted: boolean;
}

const HIGHLIGHTED_PACK = EnergyPackId.PRE_EXAM;

function formatEuros(cents: number): string {
  const euros = Math.floor(cents / 100);
  const decimals = `${cents % 100}`.padStart(2, '0');
  return `${euros},${decimals}\u00A0€`;
}

function toPackView(pack: EnergyPackDefinition): PackView {
  return {
    title: pack.title,
    credits: pack.energyAmount,
    priceLabel: formatEuros(pack.priceCents),
    unitLabel: formatEuros(Math.round(pack.priceCents / pack.energyAmount)),
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly authFacade = inject(AuthFacade);
  private readonly sentinel =
    viewChild.required<ElementRef<HTMLElement>>('sentinel');

  protected readonly scrolled = signal(false);
  protected readonly authenticated = this.authFacade.isAuthenticated;
  protected readonly packs: PackView[] = ENERGY_PACKS.map(toPackView);
  protected readonly signupGrant = SIGNUP_ENERGY_GRANT;

  constructor() {
    afterNextRender(() => {
      document.body.classList.add('landing-active');
      const observer = new IntersectionObserver(
        ([entry]) => this.scrolled.set(!entry.isIntersecting),
        { threshold: 0 },
      );
      observer.observe(this.sentinel().nativeElement);
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        document.body.classList.remove('landing-active');
      });
    });
  }
}
