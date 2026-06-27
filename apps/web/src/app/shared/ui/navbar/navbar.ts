import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  Flame,
  House,
  List,
  LogOut,
  LucideIconData,
  Target,
  TrendingUp,
} from 'lucide-angular';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
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
  imports: [RouterLink, RouterLinkActive, NgTemplateOutlet, Icon],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private readonly authFacade = inject(AuthFacade);
  private readonly router = inject(Router);

  readonly streakCount = input(0);
  readonly streakActive = input(false);

  protected readonly user = this.authFacade.currentUser;
  protected readonly flameIcon = Flame;
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
