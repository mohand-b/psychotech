import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, take } from 'rxjs';
import { AuthFacade } from '../data-access/auth.facade';

const COOLDOWN_TICK_MS = 1000;

@Injectable()
export class ResendVerificationState {
  private readonly authFacade = inject(AuthFacade);
  private readonly destroyRef = inject(DestroyRef);

  readonly sending = signal(false);
  readonly resent = signal(false);
  readonly cooldownSeconds = signal<number | null>(null);

  resend(): void {
    if (this.sending() || this.cooldownSeconds() !== null) {
      return;
    }
    this.sending.set(true);
    this.resent.set(false);
    this.authFacade
      .resendVerification()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.sending.set(false);
          if (response.sent) {
            this.resent.set(true);
            return;
          }
          if (response.retryAfterSeconds !== null) {
            this.startCooldown(response.retryAfterSeconds);
          }
        },
        error: () => this.sending.set(false),
      });
  }

  private startCooldown(seconds: number): void {
    this.cooldownSeconds.set(seconds);
    interval(COOLDOWN_TICK_MS)
      .pipe(take(seconds), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const remaining = (this.cooldownSeconds() ?? 0) - 1;
        this.cooldownSeconds.set(remaining > 0 ? remaining : null);
      });
  }
}
