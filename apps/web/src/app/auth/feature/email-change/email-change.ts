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
import { EmailChangeOutcome } from '@psychotech/shared';
import { AuthFacade } from '../../data-access/auth.facade';
import { Button } from '../../../shared/ui/button/button';

type ViewState = EmailChangeOutcome | 'PENDING' | 'MISSING';

const TITLES: Record<ViewState, string> = {
  PENDING: 'Vérification en cours…',
  MISSING: 'Lien incomplet',
  CHANGED: 'Adresse mise à jour',
  ALREADY_USED: 'Lien déjà utilisé',
  EXPIRED: 'Lien expiré',
  INVALID: 'Lien invalide',
};

const SUBTITLES: Record<ViewState, string> = {
  PENDING: 'Un instant, nous confirmons votre nouvelle adresse.',
  MISSING: 'Ouvrez le lien reçu par email pour confirmer votre adresse.',
  CHANGED:
    'Votre nouvelle adresse est désormais votre adresse de connexion.',
  ALREADY_USED:
    'Ce lien a déjà servi. Si votre adresse a bien été mise à jour, vous pouvez vous connecter.',
  EXPIRED:
    'Ce lien a dépassé sa durée de validité de 24 heures. Redemandez un changement depuis votre profil.',
  INVALID:
    "Ce lien n'est pas reconnu. Redemandez un changement d'adresse depuis votre profil.",
};

@Component({
  selector: 'app-email-change',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  template: `
    <div class="auth__panel">
      <div class="auth__head">
        <h1 class="auth__title">{{ title() }}</h1>
        <p class="auth__subtitle">{{ subtitle() }}</p>
      </div>
      @if (state() === 'CHANGED') {
        @if (email(); as address) {
          <span class="change__email t-mono">{{ address }}</span>
        }
      }
      @if (state() !== 'PENDING') {
        <div class="auth__actions">
          <ui-button
            color="brand"
            size="lg"
            [block]="true"
            (click)="continueToApp()"
          >
            {{ isAuthenticated() ? 'Revenir à mon profil' : 'Se connecter' }}
          </ui-button>
        </div>
      }
    </div>
  `,
  styles: `
    .change__email {
      font-size: 14px;
      font-weight: 600;
      color: var(--ink);
    }
  `,
})
export class EmailChange {
  private readonly authFacade = inject(AuthFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly state = signal<ViewState>('PENDING');
  protected readonly email = signal<string | null>(null);
  protected readonly isAuthenticated = this.authFacade.isAuthenticated;

  protected readonly title = computed(() => TITLES[this.state()]);
  protected readonly subtitle = computed(() => SUBTITLES[this.state()]);

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state.set('MISSING');
      return;
    }
    this.authFacade
      .verifyEmailChange(token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.state.set(response.outcome);
          this.email.set(response.email);
          if (response.outcome === 'CHANGED' && this.isAuthenticated()) {
            this.authFacade
              .loadCurrentUser()
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({ error: () => undefined });
          }
        },
        error: () => this.state.set('INVALID'),
      });
  }

  protected continueToApp(): void {
    this.router.navigate([this.isAuthenticated() ? '/profil' : '/login']);
  }
}
