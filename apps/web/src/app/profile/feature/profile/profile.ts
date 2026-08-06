import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import {
  INVALID_CURRENT_PASSWORD_ERROR_CODE,
  PASSWORD_MIN_LENGTH,
  Sector,
} from '@psychotech/shared';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ArrowLeft,
  Check,
  Lock,
  LogOut,
  LucideIconData,
  User,
} from 'lucide-angular';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { CatalogFacade } from '../../../catalog/data-access/catalog.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { ProgressionFacade } from '../../../progression/data-access/progression.facade';
import { Badge } from '../../../shared/ui/badge/badge';
import { Button } from '../../../shared/ui/button/button';
import { EnergyChip } from '../../../shared/ui/energy-chip/energy-chip';
import { Icon } from '../../../shared/ui/icon/icon';
import { SECTOR_PRESENTATION } from '../../../shared/ui/sector-presentation';
import { PasswordStrengthMeter } from '../../../shared/ui/password-strength-meter/password-strength-meter';
import { formatDayMonthYear } from '../../../shared/util/format-day-month-year';
import { passwordsMatch } from '../../../shared/util/password-match';
import { inputValue } from '../../../shared/util/input-value';

type ProfileSection = 'account' | 'security' | 'sector';

interface ProfileSectionMeta {
  title: string;
  description: string;
}

const SECTION_META: Record<ProfileSection, ProfileSectionMeta> = {
  account: {
    title: 'Informations personnelles',
    description: 'Votre identité et votre adresse de connexion.',
  },
  security: {
    title: 'Sécurité',
    description:
      'Modifiez votre mot de passe. Il vous sera demandé à chaque connexion.',
  },
  sector: {
    title: 'Secteur de préparation',
    description:
      'Le secteur définit vos épreuves et la pondération de vos scores.',
  },
};


const SAVED_STATUS_DURATION_MS = 3200;



@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Badge,
    Button,
    EnergyChip,
    Icon,
    PasswordStrengthMeter,
    RouterLink,
  ],
  providers: [ProgressionFacade],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  private readonly authFacade = inject(AuthFacade);
  private readonly catalogFacade = inject(CatalogFacade);
  private readonly energyFacade = inject(EnergyFacade);
  private readonly progressionFacade = inject(ProgressionFacade);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly accountIcon = User;
  protected readonly securityIcon = Lock;
  protected readonly logoutIcon = LogOut;
  protected readonly checkIcon = Check;
  protected readonly backIcon = ArrowLeft;

  protected readonly readValue = inputValue;

  protected readonly user = this.authFacade.currentUser;
  protected readonly energy = this.energyFacade.state;

  protected readonly section = signal<ProfileSection>('account');
  protected readonly saved = signal(false);
  protected readonly saving = signal(false);
  private savedTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly firstName = linkedSignal(
    () => this.user()?.firstName ?? '',
  );
  protected readonly lastName = linkedSignal(() => this.user()?.lastName ?? '');

  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmation = signal('');
  protected readonly securityError = signal<string | null>(null);

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.savedTimer) {
        clearTimeout(this.savedTimer);
      }
    });
  }




  protected readonly meta = computed(() => SECTION_META[this.section()]);

  protected readonly navItems = computed<
    { id: ProfileSection; label: string; icon: LucideIconData }[]
  >(() => {
    const sector = this.user()?.currentSector ?? Sector.RAILWAY;
    const items: { id: ProfileSection; label: string; icon: LucideIconData }[] =
      [
        { id: 'account', label: 'Informations', icon: this.accountIcon },
        { id: 'security', label: 'Sécurité', icon: this.securityIcon },
        {
          id: 'sector',
          label: 'Secteur',
          icon: SECTOR_PRESENTATION[sector].icon,
        },
      ];
    return items;
  });

  protected readonly initial = computed(() =>
    (this.user()?.firstName ?? '').charAt(0).toUpperCase(),
  );

  protected readonly fullName = computed(() => {
    const current = this.user();
    return current ? `${current.firstName} ${current.lastName}` : '';
  });


  protected readonly railSubtitle = computed(() => {
    const current = this.user();
    return current
      ? SECTOR_PRESENTATION[current.currentSector].label
      : '';
  });

  protected readonly dirty = computed(() => {
    const current = this.user();
    return (
      current !== null &&
      (this.firstName().trim() !== current.firstName ||
        this.lastName().trim() !== current.lastName)
    );
  });

  private readonly canSaveAccount = computed(
    () =>
      this.dirty() &&
      !this.saving() &&
      this.firstName().trim().length > 0 &&
      this.lastName().trim().length > 0,
  );

  protected readonly newPasswordLongEnough = computed(
    () => this.newPassword().length >= PASSWORD_MIN_LENGTH,
  );

  protected readonly confirmationValid = computed(() =>
    passwordsMatch(this.newPassword(), this.confirmation()),
  );

  protected readonly securityDirty = computed(
    () =>
      this.currentPassword() !== '' ||
      this.newPassword() !== '' ||
      this.confirmation() !== '',
  );

  private readonly canSaveSecurity = computed(
    () =>
      !this.saving() &&
      this.currentPassword().length > 0 &&
      this.newPassword().length >= PASSWORD_MIN_LENGTH &&
      this.confirmationValid(),
  );

  protected readonly isForm = computed(() => {
    const section = this.section();
    return section === 'account' || section === 'security';
  });

  protected readonly formDirty = computed(() =>
    this.section() === 'security' ? this.securityDirty() : this.dirty(),
  );

  protected readonly formCanSave = computed(() =>
    this.section() === 'security'
      ? this.canSaveSecurity()
      : this.canSaveAccount(),
  );

  protected readonly memberSince = computed(() => {
    const created = this.user()?.createdAt;
    return created ? formatDayMonthYear(created) : '';
  });

  protected readonly completedSessions = computed(
    () => this.progressionFacade.progression()?.stats.completedSessions ?? null,
  );

  protected readonly sectorCards = computed<
    {
      sector: Sector;
      label: string;
      icon: LucideIconData;
      active: boolean;
      coming: boolean;
    }[]
  >(() => {
    const current = this.user()?.currentSector ?? null;
    return this.catalogFacade.sectors().map((sector) => ({
      sector: sector.code,
      label: sector.label,
      icon: SECTOR_PRESENTATION[sector.code].icon,
      active: sector.code === current,
      coming: !sector.isActive,
    }));
  });












  protected readonly status = computed<{
    text: string;
    tone: 'idle' | 'dirty' | 'saved' | 'error';
  }>(() => {
    const section = this.section();
    if (section === 'account') {
      if (this.saved()) {
        return { text: 'Modifications enregistrées', tone: 'saved' };
      }
      if (this.dirty()) {
        return { text: 'Modifications non enregistrées', tone: 'dirty' };
      }
      return { text: 'Aucune modification en attente', tone: 'idle' };
    }
    if (section === 'security') {
      const error = this.securityError();
      if (error) {
        return { text: error, tone: 'error' };
      }
      if (this.saved()) {
        return { text: 'Mot de passe mis à jour', tone: 'saved' };
      }
      if (this.securityDirty()) {
        return { text: 'Modifications non enregistrées', tone: 'dirty' };
      }
      return { text: 'Aucune modification en attente', tone: 'idle' };
    }
    if (section === 'sector') {
      const current = this.user();
      return {
        text: current
          ? `Secteur ${SECTOR_PRESENTATION[current.currentSector].label} actif`
          : '',
        tone: 'idle',
      };
    }
    return { text: '', tone: 'idle' };
  });

  protected open(section: ProfileSection): void {
    this.section.set(section);
    this.saved.set(false);
    this.cancel();
  }

  protected cancel(): void {
    const current = this.user();
    this.firstName.set(current?.firstName ?? '');
    this.lastName.set(current?.lastName ?? '');
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmation.set('');
    this.securityError.set(null);
  }

  protected save(): void {
    if (!this.formCanSave()) {
      return;
    }
    if (this.section() === 'security') {
      this.saveSecurity();
      return;
    }
    this.saving.set(true);
    this.authFacade
      .updateProfile({
        firstName: this.firstName().trim(),
        lastName: this.lastName().trim(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.markSaved();
        },
        error: () => this.saving.set(false),
      });
  }

  private saveSecurity(): void {
    this.saving.set(true);
    this.securityError.set(null);
    this.authFacade
      .changePassword({
        currentPassword: this.currentPassword(),
        newPassword: this.newPassword(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.currentPassword.set('');
          this.newPassword.set('');
          this.confirmation.set('');
          this.markSaved();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.securityError.set(this.securityErrorMessage(error));
        },
      });
  }

  private markSaved(): void {
    this.saved.set(true);
    if (this.savedTimer) {
      clearTimeout(this.savedTimer);
    }
    this.savedTimer = setTimeout(
      () => this.saved.set(false),
      SAVED_STATUS_DURATION_MS,
    );
  }

  private securityErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = (error.error as { message?: string | string[] } | null)
        ?.message;
      if (message === INVALID_CURRENT_PASSWORD_ERROR_CODE) {
        return 'Mot de passe actuel invalide.';
      }
      if (Array.isArray(message)) {
        return 'Le nouveau mot de passe ne respecte pas les règles de robustesse.';
      }
    }
    return 'Le changement de mot de passe a échoué. Réessayez.';
  }

  protected logout(): void {
    this.authFacade
      .logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigate(['/login']),
        error: () => this.router.navigate(['/login']),
      });
  }
}
