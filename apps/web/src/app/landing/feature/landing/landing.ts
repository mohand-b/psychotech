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
import { LandingAxes } from '../../ui/landing-axes/landing-axes';
import { LandingCta } from '../../ui/landing-cta/landing-cta';
import { LandingDifferentiator } from '../../ui/landing-differentiator/landing-differentiator';
import { LandingEnjeu } from '../../ui/landing-enjeu/landing-enjeu';
import { LandingFaq } from '../../ui/landing-faq/landing-faq';
import { LandingFooter } from '../../ui/landing-footer/landing-footer';
import { LandingHeader } from '../../ui/landing-header/landing-header';
import { LandingHero } from '../../ui/landing-hero/landing-hero';
import { LandingHow } from '../../ui/landing-how/landing-how';
import { LandingPlatform } from '../../ui/landing-platform/landing-platform';
import { LandingScoring } from '../../ui/landing-scoring/landing-scoring';

@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LandingAxes,
    LandingCta,
    LandingDifferentiator,
    LandingEnjeu,
    LandingFaq,
    LandingFooter,
    LandingHeader,
    LandingHero,
    LandingHow,
    LandingPlatform,
    LandingScoring,
  ],
  templateUrl: './landing.html',
  styleUrls: ['./landing.css', '../../landing-theme.css'],
})
export class Landing {
  private readonly destroyRef = inject(DestroyRef);
  private readonly sentinel =
    viewChild.required<ElementRef<HTMLElement>>('sentinel');

  protected readonly scrolled = signal(false);

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
