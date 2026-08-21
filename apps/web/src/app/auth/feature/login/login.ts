import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  SSO_ERROR_QUERY_PARAM,
  SSO_RETURN_URL_QUERY_PARAM,
  isSafeReturnUrl,
} from '@psychotech/shared';
import { ArrowRight } from 'lucide-angular';
import { Button } from '../../../shared/ui/button/button';
import { FormField } from '../../../shared/ui/form-field/form-field';
import { PasswordField } from '../../../shared/ui/password-field/password-field';
import { AuthFacade } from '../../data-access/auth.facade';
import { AuthSeparator } from '../../ui/auth-separator/auth-separator';
import { GoogleSignInButton } from '../../ui/google-sign-in-button/google-sign-in-button';
import { emailErrorMessage } from '../email-validation';
import { ssoErrorMessageFromParam } from '../sso-error-messages';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    Button,
    FormField,
    PasswordField,
    AuthSeparator,
    GoogleSignInButton,
  ],
  templateUrl: './login.html',
  styleUrls: ['../auth-panel.css', './login.css'],
})
export class Login {
  private readonly authFacade = inject(AuthFacade);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly arrowIcon = ArrowRight;
  protected readonly pending = this.authFacade.pending;

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly submitted = signal(false);
  protected readonly serverError = signal<string | null>(null);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  private readonly returnUrl = computed(() => {
    const value = this.queryParams().get(SSO_RETURN_URL_QUERY_PARAM);
    return value !== null && isSafeReturnUrl(value) ? value : null;
  });

  protected readonly googleHref = computed(() =>
    this.authFacade.googleStartUrl({
      from: 'login',
      returnUrl: this.returnUrl() ?? undefined,
    }),
  );

  protected readonly ssoError = linkedSignal(() =>
    ssoErrorMessageFromParam(this.queryParams().get(SSO_ERROR_QUERY_PARAM)),
  );

  protected readonly displayedError = computed(
    () => this.serverError() ?? this.ssoError(),
  );

  protected readonly emailError = computed(() =>
    this.submitted() ? emailErrorMessage(this.email()) : null,
  );
  protected readonly passwordError = computed(() =>
    this.submitted() && this.password() === '' ? 'Mot de passe requis' : null,
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
    if (this.pending()) {
      return;
    }
    this.submitted.set(true);
    this.serverError.set(null);
    this.ssoError.set(null);
    if (this.emailError() || this.passwordError()) {
      return;
    }
    this.authFacade
      .login({ email: this.email(), password: this.password() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigateByUrl(this.returnUrl() ?? '/dashboard'),
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
