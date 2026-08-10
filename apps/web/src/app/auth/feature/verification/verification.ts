import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { EmailVerificationOutcome } from '@psychotech/shared';
import { Check, CircleAlert } from 'lucide-angular';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { AuthFacade } from '../../data-access/auth.facade';
import { isTechnicalHttpError } from '../../data-access/technical-error';
import { ResendVerificationState } from '../resend-verification-state';

type VerificationViewState = 'PENDING' | 'ERROR' | EmailVerificationOutcome;

const VIEW_TITLES: Record<VerificationViewState, string> = {
  PENDING: 'Vérification en cours',
  VERIFIED: 'Adresse confirmée',
  ALREADY_VERIFIED: 'Adresse déjà vérifiée',
  EXPIRED: 'Lien expiré',
  INVALID: 'Lien invalide',
  ERROR: 'Vérification impossible',
};

@Component({
  selector: 'app-verification',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon],
  providers: [ResendVerificationState],
  templateUrl: './verification.html',
  styleUrls: ['../auth-card.css', './verification.css'],
})
export class Verification {
  private readonly authFacade = inject(AuthFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly checkIcon = Check;
  protected readonly alertIcon = CircleAlert;
  protected readonly resendState = inject(ResendVerificationState);
  protected readonly isAuthenticated = this.authFacade.isAuthenticated;
  protected readonly state = signal<VerificationViewState>('PENDING');
  protected readonly email = signal<string | null>(null);

  protected readonly title = computed(() => VIEW_TITLES[this.state()]);
  protected readonly subtitle = computed(() => this.subtitleFor(this.state()));

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token === null || token === '') {
      this.state.set('INVALID');
      return;
    }
    this.authFacade
      .verifyEmail(token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.email.set(response.email);
          this.state.set(response.outcome);
          if (response.outcome === 'VERIFIED' && this.isAuthenticated()) {
            this.refreshConnectedAccount();
          }
        },
        error: (error: unknown) =>
          this.state.set(isTechnicalHttpError(error) ? 'ERROR' : 'INVALID'),
      });
  }

  protected goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  protected goToProfile(): void {
    this.router.navigate(['/profil']);
  }

  protected goToLogin(): void {
    this.router.navigate(['/login']);
  }

  private refreshConnectedAccount(): void {
    this.authFacade
      .loadCurrentUser()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }

  private subtitleFor(state: VerificationViewState): string {
    switch (state) {
      case 'PENDING':
        return 'Un instant, nous confirmons votre adresse email.';
      case 'VERIFIED':
        return 'Votre adresse est vérifiée. Votre compte est actif, bonne préparation.';
      case 'ALREADY_VERIFIED':
        return 'Ce lien a déjà été utilisé, votre compte est actif.';
      case 'EXPIRED':
        return this.isAuthenticated()
          ? "Ce lien n'est plus valable. Renvoyez un email pour en recevoir un nouveau."
          : "Ce lien n'est plus valable. Connectez-vous pour renvoyer un email de vérification.";
      case 'INVALID':
        return "Ce lien de vérification n'est pas reconnu. Ouvrez le lien reçu par email.";
      case 'ERROR':
        return 'Un problème technique a interrompu la vérification. Votre lien reste valable : réessayez dans un instant.';
    }
  }
}
