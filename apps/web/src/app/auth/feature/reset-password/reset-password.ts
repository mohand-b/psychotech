import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  PASSWORD_MIN_LENGTH,
  PasswordResetTokenOutcome,
} from '@psychotech/shared';
import { ArrowLeft } from 'lucide-angular';
import { Button } from '../../../shared/ui/button/button';
import { PasswordField } from '../../../shared/ui/password-field/password-field';
import { PasswordStrengthMeter } from '../../../shared/ui/password-strength-meter/password-strength-meter';
import { passwordsMatch } from '../../../shared/util/password-match';
import { AuthFacade } from '../../data-access/auth.facade';

interface PasswordRule {
  label: string;
  met: boolean;
}

@Component({
  selector: 'app-reset-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Button, PasswordField, PasswordStrengthMeter],
  templateUrl: './reset-password.html',
  styleUrls: ['../auth-panel.css', './reset-password.css'],
})
export class ResetPassword {
  private readonly authFacade = inject(AuthFacade);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly backIcon = ArrowLeft;

  private readonly token =
    this.route.snapshot.queryParamMap.get('token') ?? '';

  protected readonly checking = signal(true);
  protected readonly outcome = signal<PasswordResetTokenOutcome>('INVALID');
  protected readonly email = signal<string | null>(null);
  protected readonly definesFirstPassword = signal(false);

  protected readonly password = signal('');
  protected readonly confirmation = signal('');
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly rules = computed<readonly PasswordRule[]>(() => {
    const value = this.password();
    return [
      { label: '8 caractères', met: value.length >= PASSWORD_MIN_LENGTH },
      { label: 'Un chiffre', met: /[0-9]/.test(value) },
      { label: 'Une majuscule', met: /[A-Z]/.test(value) },
    ];
  });

  protected readonly confirmationValid = computed(() =>
    passwordsMatch(this.password(), this.confirmation()),
  );

  protected readonly passwordError = computed(() => {
    if (!this.submitted()) {
      return null;
    }
    if (this.password() === '') {
      return 'Mot de passe requis';
    }
    return this.password().length < PASSWORD_MIN_LENGTH
      ? 'Au moins 8 caractères'
      : null;
  });

  protected readonly confirmationError = computed(() => {
    if (!this.submitted()) {
      return null;
    }
    if (this.confirmation() === '') {
      return 'Confirmation requise';
    }
    return this.confirmationValid()
      ? null
      : 'Les mots de passe ne correspondent pas';
  });

  protected readonly title = computed(() =>
    this.definesFirstPassword() ? 'Définir un mot de passe' : 'Nouveau mot de passe',
  );

  constructor() {
    if (this.token === '') {
      this.checking.set(false);
      return;
    }
    this.authFacade
      .checkPasswordReset(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (check) => {
          this.outcome.set(check.outcome);
          this.email.set(check.email);
          this.definesFirstPassword.set(check.definesFirstPassword);
          this.checking.set(false);
        },
        error: () => {
          this.outcome.set('INVALID');
          this.checking.set(false);
        },
      });
  }

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
    if (this.saving()) {
      return;
    }
    this.submitted.set(true);
    this.serverError.set(null);
    if (this.passwordError() || this.confirmationError()) {
      return;
    }
    this.saving.set(true);
    this.authFacade
      .resetPassword(this.token, this.password())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.saving.set(false);
          if (result.outcome === 'RESET') {
            this.saved.set(true);
            return;
          }
          this.outcome.set(result.outcome);
        },
        error: () => {
          this.saving.set(false);
          this.serverError.set(
            'Enregistrement impossible pour le moment. Réessayez.',
          );
        },
      });
  }

  protected goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
