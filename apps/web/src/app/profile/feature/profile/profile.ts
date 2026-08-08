import { httpResource } from '@angular/common/http';
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
  BADGE_CATALOG,
  BadgeStatusDto,
  DELETE_ACCOUNT_CONFIRMATION,
  ENERGY_PACK_BY_ID,
  INVALID_CURRENT_PASSWORD_ERROR_CODE,
  PASSWORD_MIN_LENGTH,
  PackPurchaseDto,
  Sector,
} from '@psychotech/shared';
import {
  ArrowLeft,
  Check,
  Eye,
  Lock,
  LucideIconData,
  Radar,
  ReceiptText,
  User as UserIcon,
} from 'lucide-angular';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { API_BASE_URL } from '../../../core/http/api-base-url.token';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { ProgressionFacade } from '../../../progression/data-access/progression.facade';
import { AxisIcon } from '../../../shared/ui/axis-icon/axis-icon';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { PasswordStrengthMeter } from '../../../shared/ui/password-strength-meter/password-strength-meter';
import { SECTOR_PRESENTATION } from '../../../shared/ui/sector-presentation';
import { Toggle } from '../../../shared/ui/toggle/toggle';
import { formatDayMonthYear } from '../../../shared/util/format-day-month-year';
import { formatEuroAmount } from '../../../shared/util/format-euro';
import { inputValue } from '../../../shared/util/input-value';
import { passwordsMatch } from '../../../shared/util/password-match';

type ProfileSection = 'account' | 'security' | 'sector' | 'privacy' | 'credits';

interface SectionMeta {
  title: string;
  description: string;
}

interface ReceiptView {
  id: string;
  dateLabel: string;
  label: string;
  energyAmount: number;
  priceLabel: string;
  receiptUrl: string | null;
}

const SECTION_META: Record<ProfileSection, SectionMeta> = {
  account: {
    title: 'Informations personnelles',
    description: 'Votre identité et votre adresse de connexion.',
  },
  security: {
    title: 'Mot de passe',
    description: 'Il vous sera demandé à chaque connexion.',
  },
  sector: {
    title: 'Secteur de préparation',
    description:
      'Le secteur définit vos épreuves et la pondération de vos scores.',
  },
  privacy: {
    title: 'Visibilité dans la communauté',
    description: 'Ce que les autres candidats peuvent voir de vous.',
  },
  credits: {
    title: 'Crédits et reçus',
    description: 'Votre solde et vos achats de packs.',
  },
};

const UPCOMING_SECTORS = ['Médical', 'Aviation', 'Sécurité', 'Conduite'];

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisIcon, Button, Icon, PasswordStrengthMeter, RouterLink, Toggle],
  providers: [ProgressionFacade],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  private readonly authFacade = inject(AuthFacade);
  private readonly energyFacade = inject(EnergyFacade);
  private readonly progressionFacade = inject(ProgressionFacade);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly baseUrl = inject(API_BASE_URL);

  protected readonly backIcon = ArrowLeft;
  protected readonly checkIcon = Check;
  protected readonly deleteConfirmation = DELETE_ACCOUNT_CONFIRMATION;
  protected readonly readValue = inputValue;
  protected readonly upcomingSectors = UPCOMING_SECTORS;
  protected readonly totalBadges = BADGE_CATALOG.length;

  protected readonly user = this.authFacade.currentUser;
  protected readonly energy = this.energyFacade.state;
  protected readonly balance = computed(() => this.energy()?.balance ?? 0);

  protected readonly section = signal<ProfileSection>('account');
  protected readonly meta = computed(() => SECTION_META[this.section()]);

  protected readonly navItems: {
    id: ProfileSection;
    label: string;
    icon: LucideIconData;
  }[] = [
    { id: 'account', label: 'Informations', icon: UserIcon },
    { id: 'security', label: 'Sécurité', icon: Lock },
    { id: 'sector', label: 'Secteur', icon: Radar },
    { id: 'privacy', label: 'Confidentialité', icon: Eye },
    { id: 'credits', label: 'Crédits et reçus', icon: ReceiptText },
  ];

  private readonly badgeStatusesResource = httpResource<BadgeStatusDto[] | null>(
    () => `${this.baseUrl}/me/badges`,
    { defaultValue: null },
  );

  private readonly purchasesResource = httpResource<PackPurchaseDto[] | null>(
    () => `${this.baseUrl}/billing/purchases`,
    { defaultValue: null },
  );

  protected readonly initial = computed(() =>
    (this.user()?.firstName ?? '').charAt(0).toUpperCase(),
  );

  protected readonly fullName = computed(() => {
    const current = this.user();
    return current ? `${current.firstName} ${current.lastName}` : '';
  });

  protected readonly sectorLabel = computed(() => {
    const current = this.user();
    return SECTOR_PRESENTATION[current?.currentSector ?? Sector.RAILWAY].label;
  });

  protected readonly emailVerified = computed(
    () => this.user()?.emailVerifiedAt != null,
  );

  protected readonly verifiedDateLabel = computed(() => {
    const at = this.user()?.emailVerifiedAt;
    return at ? formatDayMonthYear(at) : null;
  });

  protected readonly memberSince = computed(() => {
    const created = this.user()?.createdAt;
    return created ? formatDayMonthYear(created) : '';
  });

  protected readonly completedSessions = computed(
    () => this.progressionFacade.progression()?.stats.completedSessions ?? null,
  );

  protected readonly earnedBadges = computed(() => {
    const statuses = this.badgeStatusesResource.value();
    return statuses
      ? statuses.filter((status) => status.earnedAt !== null).length
      : null;
  });

  protected readonly lastLoginLabel = computed(() => {
    const at = this.user()?.lastLoginAt;
    if (!at) {
      return null;
    }
    const date = new Date(at);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    const time = date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return sameDay
      ? `Aujourd'hui, ${time}`
      : `${formatDayMonthYear(at)}, ${time}`;
  });

  protected readonly passwordChangedLabel = computed(() => {
    const at = this.user()?.passwordChangedAt;
    return at ? `Dernière modification le ${formatDayMonthYear(at)}` : null;
  });

  protected readonly edit = signal(false);
  protected readonly firstName = linkedSignal(
    () => this.user()?.firstName ?? '',
  );
  protected readonly lastName = linkedSignal(() => this.user()?.lastName ?? '');
  protected readonly email = linkedSignal(() => this.user()?.email ?? '');
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly emailSentTo = signal<string | null>(null);
  protected readonly accountError = signal<string | null>(null);
  protected readonly resendSending = signal(false);

  protected readonly pendingEmail = computed(
    () => this.user()?.pendingEmail ?? null,
  );

  protected readonly dirty = computed(() => {
    const current = this.user();
    return (
      current !== null &&
      (this.firstName().trim() !== current.firstName ||
        this.lastName().trim() !== current.lastName ||
        this.email().trim().toLowerCase() !== current.email.toLowerCase())
    );
  });

  protected readonly canSave = computed(
    () =>
      this.dirty() &&
      !this.saving() &&
      this.firstName().trim().length > 0 &&
      this.lastName().trim().length > 0 &&
      this.email().trim().length > 3,
  );

  protected startEdit(): void {
    this.edit.set(true);
    this.saved.set(false);
    this.accountError.set(null);
  }

  protected cancelEdit(): void {
    const current = this.user();
    this.edit.set(false);
    this.firstName.set(current?.firstName ?? '');
    this.lastName.set(current?.lastName ?? '');
    this.email.set(current?.email ?? '');
    this.accountError.set(null);
  }

  protected save(): void {
    if (!this.canSave()) {
      return;
    }
    const current = this.user();
    if (!current) {
      return;
    }
    const newEmail = this.email().trim().toLowerCase();
    const emailChanged = newEmail !== current.email.toLowerCase();
    this.saving.set(true);
    this.accountError.set(null);
    this.authFacade
      .updateProfile({
        firstName: this.firstName().trim(),
        lastName: this.lastName().trim(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (emailChanged) {
            this.requestEmailChange(newEmail);
          } else {
            this.saving.set(false);
            this.edit.set(false);
            this.saved.set(true);
          }
        },
        error: () => {
          this.saving.set(false);
          this.accountError.set('Enregistrement impossible. Réessayez.');
        },
      });
  }

  private requestEmailChange(newEmail: string): void {
    this.authFacade
      .requestEmailChange(newEmail)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.saving.set(false);
          this.edit.set(false);
          this.saved.set(true);
          this.email.set(this.user()?.email ?? '');
          if (result.sent) {
            this.emailSentTo.set(newEmail);
          } else {
            this.accountError.set(
              'Un email vient déjà d’être envoyé. Patientez avant de redemander.',
            );
          }
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.email.set(this.user()?.email ?? '');
          this.accountError.set(
            this.errorIncludes(error, 'EMAIL_TAKEN')
              ? 'Cette adresse est déjà utilisée par un autre compte.'
              : 'Le changement d’adresse n’a pas pu être demandé. Réessayez.',
          );
        },
      });
  }

  protected resendVerification(): void {
    if (this.resendSending()) {
      return;
    }
    this.resendSending.set(true);
    const pending = this.pendingEmail();
    const request = pending
      ? this.authFacade.requestEmailChange(pending)
      : this.authFacade.resendVerification();
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.resendSending.set(false);
        this.emailSentTo.set(pending ?? this.user()?.email ?? null);
      },
      error: () => this.resendSending.set(false),
    });
  }

  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmation = signal('');
  protected readonly pwSaving = signal(false);
  protected readonly pwDone = signal(false);
  protected readonly securityError = signal<string | null>(null);

  protected readonly confirmationValid = computed(() =>
    passwordsMatch(this.newPassword(), this.confirmation()),
  );

  protected readonly canUpdatePassword = computed(
    () =>
      !this.pwSaving() &&
      this.currentPassword().length > 0 &&
      this.newPassword().length >= PASSWORD_MIN_LENGTH &&
      this.confirmationValid(),
  );

  protected readonly pwCriteria = computed(() => {
    const value = this.newPassword();
    return [
      { label: '8 caractères', met: value.length >= PASSWORD_MIN_LENGTH },
      { label: 'Un chiffre', met: /[0-9]/.test(value) },
      { label: 'Une majuscule', met: /[A-Z]/.test(value) },
    ];
  });

  protected updatePassword(): void {
    if (!this.canUpdatePassword()) {
      return;
    }
    this.pwSaving.set(true);
    this.securityError.set(null);
    this.authFacade
      .changePassword({
        currentPassword: this.currentPassword(),
        newPassword: this.newPassword(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pwSaving.set(false);
          this.pwDone.set(true);
          this.currentPassword.set('');
          this.newPassword.set('');
          this.confirmation.set('');
        },
        error: (error: unknown) => {
          this.pwSaving.set(false);
          this.securityError.set(
            this.errorIncludes(error, INVALID_CURRENT_PASSWORD_ERROR_CODE)
              ? 'Le mot de passe actuel est incorrect.'
              : 'La mise à jour a échoué. Réessayez.',
          );
        },
      });
  }

  protected readonly showInFeed = linkedSignal(
    () => this.user()?.showInFeed ?? false,
  );
  protected readonly filSaved = signal(false);

  protected toggleFeed(next: boolean): void {
    this.showInFeed.set(next);
    this.authFacade
      .updateProfile({ showInFeed: next })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.filSaved.set(true),
        error: () => this.showInFeed.set(this.user()?.showInFeed ?? false),
      });
  }

  protected readonly previewWho = computed(() =>
    this.showInFeed() ? (this.user()?.firstName ?? '') : 'Un candidat',
  );

  protected readonly receipts = computed<ReceiptView[] | null>(() => {
    const purchases = this.purchasesResource.value();
    if (!purchases) {
      return null;
    }
    return purchases.map((purchase) => ({
      id: purchase.id,
      dateLabel: new Date(purchase.purchasedAt).toLocaleDateString('fr-FR'),
      label: `Pack ${ENERGY_PACK_BY_ID.get(purchase.packId)?.title ?? purchase.packId}`,
      energyAmount: purchase.energyAmount,
      priceLabel: `${formatEuroAmount(purchase.amountCents / 100)} €`,
      receiptUrl: purchase.receiptUrl,
    }));
  });

  protected readonly deleteOpen = signal(false);
  protected readonly deletePassword = signal('');
  protected readonly deleteConfirmationInput = signal('');
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  protected readonly canDelete = computed(
    () =>
      !this.deleting() &&
      this.deletePassword().length > 0 &&
      this.deleteConfirmationInput().trim().toUpperCase() ===
        DELETE_ACCOUNT_CONFIRMATION,
  );

  protected openDelete(): void {
    this.deleteOpen.set(true);
    this.deletePassword.set('');
    this.deleteConfirmationInput.set('');
    this.deleteError.set(null);
  }

  protected closeDelete(): void {
    this.deleteOpen.set(false);
  }

  protected confirmDelete(): void {
    if (!this.canDelete()) {
      return;
    }
    this.deleting.set(true);
    this.deleteError.set(null);
    this.authFacade
      .deleteAccount({
        password: this.deletePassword(),
        confirmation: DELETE_ACCOUNT_CONFIRMATION,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigate(['/']),
        error: (error: unknown) => {
          this.deleting.set(false);
          this.deleteError.set(
            this.errorIncludes(error, INVALID_CURRENT_PASSWORD_ERROR_CODE)
              ? 'Le mot de passe est incorrect.'
              : 'La suppression a échoué. Réessayez.',
          );
        },
      });
  }

  protected goToCredits(): void {
    this.router.navigate(['/credits']);
  }

  protected open(section: ProfileSection): void {
    this.section.set(section);
    this.saved.set(false);
    this.pwDone.set(false);
    this.filSaved.set(false);
    this.accountError.set(null);
    this.securityError.set(null);
    this.cancelEdit();
  }

  protected logout(): void {
    this.authFacade
      .logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigate(['/']),
        error: () => this.router.navigate(['/']),
      });
  }

  protected touchAccount(): void {
    this.saved.set(false);
  }

  private errorIncludes(error: unknown, code: string): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }
    const body = (error as { error?: unknown }).error;
    return JSON.stringify(body ?? error).includes(code);
  }
}
