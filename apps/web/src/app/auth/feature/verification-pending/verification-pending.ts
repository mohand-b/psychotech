import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { EMPTY, catchError, interval, switchMap } from 'rxjs';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { Button } from '../../../shared/ui/button/button';
import { AuthFacade } from '../../data-access/auth.facade';
import { ResendVerificationState } from '../resend-verification-state';

const PROFILE_POLL_INTERVAL_MS = 5000;

@Component({
  selector: 'app-verification-pending',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  providers: [ResendVerificationState],
  templateUrl: './verification-pending.html',
  styleUrls: ['../auth-panel.css', './verification-pending.css'],
})
export class VerificationPending {
  private readonly authFacade = inject(AuthFacade);
  private readonly energyFacade = inject(EnergyFacade);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly resendState = inject(ResendVerificationState);
  protected readonly email = computed(
    () => this.authFacade.currentUser()?.email ?? '',
  );

  constructor() {
    effect(() => {
      const verifiedAt = this.authFacade.currentUser()?.emailVerifiedAt ?? null;
      if (verifiedAt === null) {
        return;
      }
      untracked(() => this.leaveAsVerified());
    });
    interval(PROFILE_POLL_INTERVAL_MS)
      .pipe(
        switchMap(() =>
          this.authFacade.loadCurrentUser().pipe(catchError(() => EMPTY)),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  protected logout(): void {
    this.authFacade.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }

  private leaveAsVerified(): void {
    this.energyFacade
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
    this.router.navigate(['/dashboard']);
  }
}
