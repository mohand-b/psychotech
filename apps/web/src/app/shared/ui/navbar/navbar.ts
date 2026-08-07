import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { EnergyStateDto, UserProfileDto } from '@psychotech/shared';
import {
  House,
  List,
  LogOut,
  LucideIconData,
  Target,
  TrendingUp,
} from 'lucide-angular';
import { EnergyChip } from '../energy-chip/energy-chip';
import { Icon } from '../icon/icon';
import { SectorChip } from '../sector-chip/sector-chip';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIconData;
}

@Component({
  selector: 'ui-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Icon, EnergyChip, SectorChip],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  readonly hideMobile = input(false);
  readonly hideMobileTabs = input(false);
  readonly user = input.required<UserProfileDto | null>();
  readonly energy = input.required<EnergyStateDto | null>();
  readonly logoutRequested = output<void>();

  protected readonly logOutIcon = LogOut;

  protected readonly navItems: readonly NavItem[] = [
    { label: 'Accueil', path: '/dashboard', icon: House },
    { label: 'Entraînements', path: '/entrainements', icon: Target },
    { label: 'Mes sessions', path: '/sessions', icon: List },
    { label: 'Progression', path: '/progression', icon: TrendingUp },
  ];

  protected readonly sector = computed(
    () => this.user()?.currentSector ?? null,
  );

  protected readonly energyLink = computed(() => '/credits');

  protected logout(): void {
    this.logoutRequested.emit();
  }
}
