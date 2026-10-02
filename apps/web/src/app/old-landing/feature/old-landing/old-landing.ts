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
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { OldLandingAxes } from '../../ui/old-landing-axes/old-landing-axes';
import { OldLandingCta } from '../../ui/old-landing-cta/old-landing-cta';
import { OldLandingDifferentiator } from '../../ui/old-landing-differentiator/old-landing-differentiator';
import { OldLandingEnjeu } from '../../ui/old-landing-enjeu/old-landing-enjeu';
import { OldLandingFaq } from '../../ui/old-landing-faq/old-landing-faq';
import { OldLandingFooter } from '../../ui/old-landing-footer/old-landing-footer';
import { OldLandingHeader } from '../../ui/old-landing-header/old-landing-header';
import { OldLandingHero } from '../../ui/old-landing-hero/old-landing-hero';
import { OldLandingHow } from '../../ui/old-landing-how/old-landing-how';
import { OldLandingPlatform } from '../../ui/old-landing-platform/old-landing-platform';
import { OldLandingScoring } from '../../ui/old-landing-scoring/old-landing-scoring';

@Component({
  selector: 'app-old-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OldLandingAxes,
    OldLandingCta,
    OldLandingDifferentiator,
    OldLandingEnjeu,
    OldLandingFaq,
    OldLandingFooter,
    OldLandingHeader,
    OldLandingHero,
    OldLandingHow,
    OldLandingPlatform,
    OldLandingScoring,
  ],
  templateUrl: './old-landing.html',
  styleUrls: ['./old-landing.css', '../../old-landing-theme.css'],
})
export class OldLanding {
  private readonly destroyRef = inject(DestroyRef);
  private readonly authFacade = inject(AuthFacade);
  private readonly sentinel =
    viewChild.required<ElementRef<HTMLElement>>('sentinel');

  protected readonly scrolled = signal(false);
  protected readonly authenticated = this.authFacade.isAuthenticated;

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
