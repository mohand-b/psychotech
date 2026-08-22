import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { PASSWORD_RESET_TTL_MINUTES } from '@psychotech/shared';
import { ArrowLeft, ArrowRight } from 'lucide-angular';
import { Button } from '../../../shared/ui/button/button';
import { FormField } from '../../../shared/ui/form-field/form-field';
import { AuthFacade } from '../../data-access/auth.facade';
import { emailErrorMessage } from '../email-validation';

@Component({
  selector: 'app-forgot-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Button, FormField],
  templateUrl: './forgot-password.html',
  styleUrls: ['../auth-panel.css', './forgot-password.css'],
})
export class ForgotPassword {
  private readonly authFacade = inject(AuthFacade);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly arrowIcon = ArrowRight;
  protected readonly backIcon = ArrowLeft;
  protected readonly ttlMinutes = PASSWORD_RESET_TTL_MINUTES;

  protected readonly email = signal('');
  protected readonly submitted = signal(false);
  protected readonly sending = signal(false);
  protected readonly sentTo = signal<string | null>(null);
  protected readonly resent = signal(false);

  protected readonly emailError = computed(() =>
    this.submitted() ? emailErrorMessage(this.email()) : null,
  );

  protected submitOnEnter(event: Event): void {
    if (
      event instanceof KeyboardEvent &&
      event.key === 'Enter' &&
      event.target instanceof HTMLInputElement
    ) {
      this.submit();
    }
  }

  protected submit(): void {
    if (this.sending()) {
      return;
    }
    this.submitted.set(true);
    if (this.emailError()) {
      return;
    }
    this.send(() => this.sentTo.set(this.email().trim()));
  }

  protected resend(): void {
    if (this.sending() || this.resent()) {
      return;
    }
    this.send(() => this.resent.set(true));
  }

  private send(onDone: () => void): void {
    this.sending.set(true);
    this.authFacade
      .requestPasswordReset(this.email())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.sending.set(false);
          onDone();
        },
        error: () => {
          this.sending.set(false);
          onDone();
        },
      });
  }
}
