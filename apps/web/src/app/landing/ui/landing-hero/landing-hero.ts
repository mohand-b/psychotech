import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AxisType } from '@psychotech/shared';
import { LucideIconData } from 'lucide-angular';
import { Icon } from '../../../shared/ui/icon/icon';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';

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
}
