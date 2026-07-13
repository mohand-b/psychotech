import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ArrowRight, Mail } from 'lucide-angular';
import { Button } from '../../../shared/ui/button/button';
import { FormField } from '../../../shared/ui/form-field/form-field';
import { PasswordField } from '../../../shared/ui/password-field/password-field';
import { AuthFacade } from '../../data-access/auth.facade';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Button, FormField, PasswordField],
  templateUrl: './login.html',
  styleUrls: ['../auth-panel.css', './login.css'],
})
export class Login {
  private readonly authFacade = inject(AuthFacade);
  private readonly router = inject(Router);

  protected readonly mailIcon = Mail;
  protected readonly arrowIcon = ArrowRight;
  protected readonly pending = this.authFacade.pending;

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly submitted = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly emailError = computed(() => {
    if (!this.submitted()) {
      return null;
    }
    if (this.email().trim() === '') {
      return 'Adresse email requise';
    }
    return EMAIL_PATTERN.test(this.email()) ? null : 'Adresse email invalide';
  });
  protected readonly passwordError = computed(() =>
    this.submitted() && this.password() === '' ? 'Mot de passe requis' : null,
  );

  protected submit(): void {
    this.submitted.set(true);
    this.serverError.set(null);
    if (this.emailError() || this.passwordError()) {
      return;
    }
    this.authFacade
      .login({ email: this.email(), password: this.password() })
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (error: unknown) =>
          this.serverError.set(this.toServerError(error)),
      });
  }

  private toServerError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      return 'Identifiants invalides.';
    }
    return 'Connexion impossible pour le moment. Réessayez.';
  }
}
