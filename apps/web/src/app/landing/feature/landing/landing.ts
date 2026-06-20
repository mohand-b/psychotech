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
import { LandingHeader } from '../../ui/landing-header/landing-header';
import { LandingHero } from '../../ui/landing-hero/landing-hero';

@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LandingHeader, LandingHero],
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
