import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Sector, SectorSummaryDto } from '@psychotech/shared';
import { ArrowRight } from 'lucide-angular';
import { CatalogFacade } from '../../../catalog/data-access/catalog.facade';
import { Button } from '../../../shared/ui/button/button';
import { FormField } from '../../../shared/ui/form-field/form-field';
import { Icon } from '../../../shared/ui/icon/icon';
import { PasswordField } from '../../../shared/ui/password-field/password-field';
import { PasswordStrengthMeter } from '../../../shared/ui/password-strength-meter/password-strength-meter';
import { SECTOR_PRESENTATION } from '../../../shared/ui/sector-presentation';
import { SelectOption } from '../../../shared/ui/select/select';
import { passwordsMatch } from '../../../shared/util/password-match';
import { AuthFacade } from '../../data-access/auth.facade';

const PASSWORD_MIN_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    Button,
    FormField,
    Icon,
    PasswordField,
    PasswordStrengthMeter,
  ],
  templateUrl: './register.html',
  styleUrls: ['../auth-panel.css', './register.css'],
})
export class Register {
  private readonly authFacade = inject(AuthFacade);
  private readonly catalogFacade = inject(CatalogFacade);
  private readonly router = inject(Router);

  protected readonly arrowIcon = ArrowRight;
  protected readonly pending = this.authFacade.pending;

  protected readonly step = signal<1 | 2>(1);
  protected readonly stepDirection = signal<'entry' | 'forward' | 'back'>(
    'entry',
  );
  protected readonly cgu = signal(false);

  protected readonly firstName = signal('');
  protected readonly lastName = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly confirmation = signal('');

  protected readonly submitted = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly sectorOptions = computed<readonly SelectOption[]>(() =>
    this.catalogFacade.sectors().map((sector: SectorSummaryDto) => ({
      value: sector.code,
      label: sector.label,
      disabled: !sector.isActive,
    })),
  );
  protected readonly catalogError = computed(() =>
    this.catalogFacade.sectorsError()
      ? 'Impossible de charger les secteurs. Réessayez plus tard.'
      : null,
  );

  protected readonly sector = linkedSignal<string>(
    () =>
      this.catalogFacade.sectors().find((sector) => sector.isActive)?.code ??
      Sector.RAILWAY,
  );

  protected readonly activeSectors = computed(() =>
    this.sectorOptions().filter((option) => !option.disabled),
  );
  protected readonly comingSectors = computed(() =>
    this.sectorOptions().filter((option) => option.disabled),
  );
  protected readonly sectorLabel = computed(
    () =>
      this.sectorOptions().find((option) => option.value === this.sector())
        ?.label ?? '',
  );

  protected sectorIcon(value: string) {
    return SECTOR_PRESENTATION[value as Sector].icon;
  }

  protected goToStep(target: 1 | 2): void {
    this.stepDirection.set(target > this.step() ? 'forward' : 'back');
    this.step.set(target);
  }

  protected readonly confirmationValid = computed(() =>
    passwordsMatch(this.password(), this.confirmation()),
  );

  protected readonly firstNameError = computed(() =>
    this.submitted() && this.firstName().trim() === '' ? 'Prénom requis' : null,
  );
  protected readonly lastNameError = computed(() =>
    this.submitted() && this.lastName().trim() === '' ? 'Nom requis' : null,
  );
  protected readonly emailError = computed(() => {
    if (!this.submitted()) {
      return null;
    }
    if (this.email().trim() === '') {
      return 'Adresse email requise';
    }
    return EMAIL_PATTERN.test(this.email()) ? null : 'Adresse email invalide';
  });
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

  protected submitOnEnter(event: Event): void {
    if (!(event instanceof KeyboardEvent) || event.key !== 'Enter') {
      return;
    }
    if (event.target instanceof HTMLInputElement) {
      this.submit();
    }
  }

  protected submit(): void {
    if (this.pending()) {
      return;
    }
    if (!this.cgu()) {
      return;
    }
    this.submitted.set(true);
    this.serverError.set(null);
    if (
      this.firstNameError() ||
      this.lastNameError() ||
      this.emailError() ||
      this.passwordError() ||
      this.confirmationError()
    ) {
      return;
    }
    this.authFacade
      .register({
        email: this.email(),
        password: this.password(),
        firstName: this.firstName(),
        lastName: this.lastName(),
        currentSector: this.sector() as Sector,
      })
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (error: unknown) =>
          this.serverError.set(this.toServerError(error)),
      });
  }

  private toServerError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      return 'Un compte existe déjà avec cette adresse email.';
    }
    return 'Inscription impossible pour le moment. Réessayez.';
  }
}
