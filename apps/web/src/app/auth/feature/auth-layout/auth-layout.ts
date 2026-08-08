import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { LogOut } from 'lucide-angular';
import { filter, map } from 'rxjs';
import { Icon } from '../../../shared/ui/icon/icon';
import { AuthFacade } from '../../data-access/auth.facade';

@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RouterOutlet, RouterLink],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
})
export class AuthLayout {
  private readonly authFacade = inject(AuthFacade);
  private readonly router = inject(Router);

  protected readonly logoutIcon = LogOut;

  protected readonly showLogout = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url.startsWith('/verification-email')),
    ),
    { initialValue: this.router.url.startsWith('/verification-email') },
  );

  protected logout(): void {
    this.authFacade.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
