import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  House,
  List,
  LogOut,
  LucideIconData,
  Target,
  TrendingUp,
} from 'lucide-angular';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { EnergyGauge } from '../energy-gauge/energy-gauge';
import { Icon } from '../icon/icon';
import { SECTOR_PRESENTATION } from '../sector-presentation';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIconData;
}

@Component({
  selector: 'ui-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Icon, EnergyGauge],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  readonly hideMobile = input(false);
  readonly hideMobileTabs = input(false);

  private readonly authFacade = inject(AuthFacade);
  private readonly energyFacade = inject(EnergyFacade);
  private readonly router = inject(Router);

  protected readonly user = this.authFacade.currentUser;
  protected readonly energy = this.energyFacade.state;
  protected readonly logOutIcon = LogOut;

  protected readonly navItems: readonly NavItem[] = [
    { label: 'Accueil', path: '/dashboard', icon: House },
    { label: 'Entraînements', path: '/entrainements', icon: Target },
    { label: 'Mes sessions', path: '/sessions', icon: List },
    { label: 'Progression', path: '/progression', icon: TrendingUp },
  ];

  protected readonly sector = computed(() => {
    const current = this.user();
    return current ? SECTOR_PRESENTATION[current.currentSector] : null;
  });

  protected logout(): void {
    this.authFacade.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
