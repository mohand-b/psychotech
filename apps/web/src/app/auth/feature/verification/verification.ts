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
import { ArrowRight } from 'lucide-angular';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { AxisIcon } from '../../../shared/ui/axis-icon/axis-icon';
import { Button } from '../../../shared/ui/button/button';
import { AuthFacade } from '../../data-access/auth.facade';
import { ResendVerificationState } from '../resend-verification-state';

type VerificationViewState = 'PENDING' | EmailVerificationOutcome;

const VIEW_TITLES: Record<VerificationViewState, string> = {
  PENDING: 'Vérification en cours',
  VERIFIED: 'Adresse vérifiée',
  ALREADY_VERIFIED: 'Adresse déjà vérifiée',
  EXPIRED: 'Lien expiré',
  INVALID: 'Lien invalide',
};

@Component({
  selector: 'app-verification',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisIcon, Button],
  providers: [ResendVerificationState],
  templateUrl: './verification.html',
  styleUrls: ['../auth-panel.css', './verification.css'],
})
export class Verification {
  private readonly authFacade = inject(AuthFacade);
  private readonly energyFacade = inject(EnergyFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly arrowIcon = ArrowRight;
  protected readonly resendState = inject(ResendVerificationState);
  protected readonly isAuthenticated = this.authFacade.isAuthenticated;
  protected readonly state = signal<VerificationViewState>('PENDING');
  protected readonly grantedEnergy = signal(0);

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
          this.grantedEnergy.set(response.grantedEnergy);
          this.state.set(response.outcome);
          if (response.outcome === 'VERIFIED' && this.isAuthenticated()) {
            this.refreshConnectedAccount();
          }
        },
        error: () => this.state.set('INVALID'),
      });
  }

  protected goToTraining(): void {
    this.router.navigate(['/entrainements']);
  }

  protected goToLogin(): void {
    this.router.navigate(['/login']);
  }

  private refreshConnectedAccount(): void {
    this.authFacade
      .loadCurrentUser()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
    this.energyFacade
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }

  private subtitleFor(state: VerificationViewState): string {
    switch (state) {
      case 'PENDING':
        return 'Un instant, nous confirmons votre adresse e-mail.';
      case 'VERIFIED':
        return 'Votre compte est prêt. Bonne préparation.';
      case 'ALREADY_VERIFIED':
        return 'Ce lien a déjà été utilisé, votre compte est actif.';
      case 'EXPIRED':
        return this.isAuthenticated()
          ? "Ce lien n'est plus valable. Renvoyez un e-mail pour en recevoir un nouveau."
          : "Ce lien n'est plus valable. Connectez-vous pour renvoyer un e-mail de vérification.";
      case 'INVALID':
        return "Ce lien de vérification n'est pas reconnu. Ouvrez le lien reçu par e-mail.";
    }
  }
}
