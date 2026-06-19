import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthFacade } from '../../../auth/data-access/auth.facade';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly authFacade = inject(AuthFacade);
  private readonly router = inject(Router);
  protected readonly currentUser = this.authFacade.currentUser;

  logout(): void {
    this.authFacade.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
