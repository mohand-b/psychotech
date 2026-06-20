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
import { AxisType, Sector, SECTOR_AXES } from '@psychotech/shared';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, LucideIconData } from 'lucide-angular';
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
  description: string;
  axes: HeroAxis[];
}

function axesFor(sector: Sector): HeroAxis[] {
  return SECTOR_AXES[sector].map((axis: AxisType) => {
    const presentation = AXIS_PRESENTATION[axis];
    return {
      label: presentation.label,
      icon: presentation.icon,
      colorVar: presentation.plainVar,
    };
  });
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

  protected readonly arrowIcon = ArrowRight;
  protected readonly railwayAxes: readonly HeroAxis[] = axesFor(Sector.RAILWAY);

  protected readonly bands: readonly SectorBand[] = [
    {
      name: 'Aviation',
      image: '/sectors/aviation',
      alt: 'Secteur aérien',
      description:
        'Sélections du personnel navigant et des métiers du contrôle aérien, où le palier psychotechnique est déterminant.',
      axes: axesFor(Sector.AVIATION),
    },
    {
      name: 'Sécurité',
      image: '/sectors/securite',
      alt: 'Secteur sécurité',
      description:
        'Concours et tests d’aptitude des métiers de la sûreté, exigeants sur la vigilance et la prise de décision.',
      axes: axesFor(Sector.SECURITY),
    },
    {
      name: 'Conduite',
      image: '/sectors/conduite',
      alt: 'Secteur conduite',
      description:
        'Sélections des métiers de la conduite et du transport, centrées sur la vigilance, la perception et la coordination.',
      axes: axesFor(Sector.DRIVING),
    },
    {
      name: 'Médical',
      image: '/sectors/medical',
      alt: 'Secteur médical',
      description:
        'Épreuves d’admission des filières de soin, sous forte charge cognitive et attentionnelle.',
      axes: axesFor(Sector.HEALTHCARE),
    },
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
