import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  NgZone,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AxisType } from '@psychotech/shared';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { LucideIconData } from 'lucide-angular';
import { Icon } from '../../../shared/ui/icon/icon';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';

gsap.registerPlugin(ScrollTrigger);

interface HeroAxis {
  label: string;
  icon: LucideIconData;
  colorVar: string;
}

interface SectorBand {
  name: string;
  image: string;
  alt: string;
}

@Component({
  selector: 'app-landing-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon],
  templateUrl: './landing-hero.html',
  styleUrl: './landing-hero.css',
})
export class LandingHero {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly axes: readonly HeroAxis[] = [
    AxisType.LOGIC,
    AxisType.MEMORY,
    AxisType.VISUAL_DISCRIMINATION,
    AxisType.REACTIVITY,
    AxisType.MOTOR_SKILLS,
  ].map((axis) => ({
    label: AXIS_PRESENTATION[axis].label,
    icon: AXIS_PRESENTATION[axis].icon,
    colorVar: AXIS_PRESENTATION[axis].plainVar,
  }));

  protected readonly bands: readonly SectorBand[] = [
    { name: 'Aviation', image: '/sectors/aviation', alt: 'Secteur aérien' },
    { name: 'Sécurité', image: '/sectors/securite', alt: 'Secteur sécurité' },
    { name: 'Industrie', image: '/sectors/industrie', alt: 'Secteur industrie' },
    { name: 'Médical', image: '/sectors/medical', alt: 'Secteur médical' },
  ];

  constructor() {
    afterNextRender(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      this.zone.runOutsideAngular(() => {
        const context = gsap.context(() => {
          gsap.to('.hero__animate', {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.12,
            delay: 0.1,
          });
          gsap.to('.hero__media--parallax .hero__image', {
            yPercent: -8,
            ease: 'none',
            scrollTrigger: {
              trigger: this.host.nativeElement,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
            },
          });
        }, this.host.nativeElement);
        this.destroyRef.onDestroy(() => context.revert());
      });
    });
  }
}
