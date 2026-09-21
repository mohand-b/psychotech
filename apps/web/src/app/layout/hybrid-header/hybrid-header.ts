import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  input,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ArrowLeft } from 'lucide-angular';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { EnergyFacade } from '../../energy/data-access/energy.facade';
import { Icon } from '../../shared/ui/icon/icon';
import { Navbar } from '../../shared/ui/navbar/navbar';

export type HybridHeaderMobileLayout = 'back' | 'app';

const CONNECTED_MOBILE_BACK_LINK = '/profil';
const PUBLIC_HOME_LINK = '/';

@Component({
  selector: 'app-hybrid-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Navbar, RouterLink],
  templateUrl: './hybrid-header.html',
  styleUrl: './hybrid-header.css',
})
export class HybridHeader {
  private readonly authFacade = inject(AuthFacade);
  private readonly energyFacade = inject(EnergyFacade);
  private readonly router = inject(Router);

  readonly mobileTitle = input('');
  readonly mobileLayout = input<HybridHeaderMobileLayout>('back');

  protected readonly backIcon = ArrowLeft;
  protected readonly homeLink = PUBLIC_HOME_LINK;
  protected readonly authenticated = this.authFacade.isAuthenticated;
  protected readonly user = this.authFacade.currentUser;
  protected readonly energy = this.energyFacade.state;
  protected readonly appLayout = computed(() => this.mobileLayout() === 'app');
  protected readonly mobileBackLink = computed(() =>
    this.authenticated() ? CONNECTED_MOBILE_BACK_LINK : PUBLIC_HOME_LINK,
  );

  constructor() {
    afterNextRender(() => {
      if (this.authenticated() && this.energy() === null) {
        this.energyFacade.load().subscribe();
      }
    });
  }

  protected logout(): void {
    this.authFacade.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
