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
  BillingPeriod,
  INVALID_CURRENT_PASSWORD_ERROR_CODE,
  PASSWORD_MIN_LENGTH,
  PaymentMethodOverviewDto,
  Sector,
  SubscriptionTier,
} from '@psychotech/shared';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Check,
  CreditCard,
  Lock,
  LogOut,
  LucideIconData,
  User,
  Zap,
} from 'lucide-angular';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { ProgressionFacade } from '../../../progression/data-access/progression.facade';
import { SubscriptionsFacade } from '../../../subscriptions/data-access/subscriptions.facade';
import { Icon } from '../../../shared/ui/icon/icon';
import {
  SECTOR_PRESENTATION,
  SectorPresentation,
} from '../../../shared/ui/sector-presentation';
import { buildPaymentMethodView } from '../../../shared/ui/payment-method-view';
import { PasswordStrengthMeter } from '../../../shared/ui/password-strength-meter/password-strength-meter';
import { formatDayMonthYear } from '../../../shared/util/format-day-month-year';
import { PLAN_LABELS } from '../../../shared/util/plan-labels';
import { passwordsMatch } from '../../../shared/util/password-match';
import { SUBSCRIPTION_MONTHLY_PRICES } from '../../../shared/util/subscription-prices';
import { inputValue } from '../../../shared/util/input-value';

type ProfileSection = 'account' | 'security' | 'sector' | 'plan' | 'billing';

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
  plan: {
    title: 'Abonnement',
    description: 'Votre formule actuelle, son renouvellement et son évolution.',
  },
  billing: {
    title: 'Facturation',
    description: 'Moyen de paiement et prochaine facture.',
  },
};

const PLAN_COPY: Record<SubscriptionTier, { name: string; description: string }> = {
  [SubscriptionTier.FREE]: {
    name: PLAN_LABELS[SubscriptionTier.FREE],
    description: 'Mode découverte de chaque axe, en libre accès.',
  },
  [SubscriptionTier.ESSENTIAL]: {
    name: PLAN_LABELS[SubscriptionTier.ESSENTIAL],
    description: '5 énergies par jour, rechargées à minuit.',
  },
  [SubscriptionTier.UNLIMITED]: {
    name: PLAN_LABELS[SubscriptionTier.UNLIMITED],
    description: 'Énergie illimitée, tous les axes et toutes les simulations.',
  },
};

const SECTOR_ORDER: readonly Sector[] = [
  Sector.RAILWAY,
  Sector.HEALTHCARE,
  Sector.AVIATION,
  Sector.SECURITY,
  Sector.DRIVING,
];

const SAVED_STATUS_DURATION_MS = 3200;

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, PasswordStrengthMeter, RouterLink],
  providers: [ProgressionFacade],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  private readonly authFacade = inject(AuthFacade);
  private readonly coreFacade = inject(CoreFacade);
  private readonly energyFacade = inject(EnergyFacade);
  private readonly progressionFacade = inject(ProgressionFacade);
  private readonly subscriptionsFacade = inject(SubscriptionsFacade);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly accountIcon = User;
  protected readonly securityIcon = Lock;
  protected readonly planIcon = Zap;
  protected readonly billingIcon = CreditCard;
  protected readonly logoutIcon = LogOut;
  protected readonly checkIcon = Check;

  protected readonly readValue = inputValue;
  protected readonly tiers = SubscriptionTier;

  protected readonly user = this.authFacade.currentUser;
  protected readonly tier = this.coreFacade.tier;
  protected readonly energy = this.energyFacade.state;

  protected readonly section = signal<ProfileSection>('account');
  protected readonly saved = signal(false);
  protected readonly saving = signal(false);
  protected readonly paymentOverview =
    signal<PaymentMethodOverviewDto | null>(null);
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
    if (this.tier() !== SubscriptionTier.FREE) {
      this.subscriptionsFacade
        .getPaymentMethodOverview()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (overview) => this.paymentOverview.set(overview),
          error: () => this.paymentOverview.set(null),
        });
    }
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
        { id: 'plan', label: 'Abonnement', icon: this.planIcon },
      ];
    if (this.tier() !== SubscriptionTier.FREE) {
      items.push({
        id: 'billing',
        label: 'Facturation',
        icon: this.billingIcon,
      });
    }
    return items;
  });

  protected readonly initial = computed(() =>
    (this.user()?.firstName ?? '').charAt(0).toUpperCase(),
  );

  protected readonly fullName = computed(() => {
    const current = this.user();
    return current ? `${current.firstName} ${current.lastName}` : '';
  });

  protected readonly plan = computed(() => PLAN_COPY[this.tier()]);

  protected readonly railSubtitle = computed(() => {
    const current = this.user();
    return current
      ? `${this.plan().name} · ${SECTOR_PRESENTATION[current.currentSector].label}`
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

  protected readonly passwordChecks = computed(() => {
    const value = this.newPassword();
    return {
      length: value.length >= PASSWORD_MIN_LENGTH,
      digit: /[0-9]/.test(value),
      uppercase: /[A-Z]/.test(value),
    };
  });

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
    { sector: Sector; presentation: SectorPresentation; active: boolean }[]
  >(() => {
    const current = this.user()?.currentSector ?? null;
    return SECTOR_ORDER.map((sector) => ({
      sector,
      presentation: SECTOR_PRESENTATION[sector],
      active: sector === current,
    }));
  });

  protected readonly priceLabel = computed(() => {
    const tier = this.tier();
    return tier === SubscriptionTier.FREE
      ? null
      : `${SUBSCRIPTION_MONTHLY_PRICES[tier]} €`;
  });

  protected readonly renewalLabel = computed(() => {
    const periodEnd = this.user()?.subscription?.currentPeriodEnd;
    return periodEnd ? formatDayMonthYear(periodEnd) : null;
  });

  protected readonly billingPeriodLabel = computed(() => {
    const period = this.user()?.subscription?.billingPeriod;
    return period === BillingPeriod.ANNUAL
      ? 'Annuelle'
      : period === BillingPeriod.MONTHLY
        ? 'Mensuelle'
        : null;
  });

  protected readonly dailyEnergyLabel = computed(() => {
    if (this.tier() === SubscriptionTier.UNLIMITED) {
      return 'Illimitée';
    }
    const state = this.energy();
    return state ? `${state.balance}/${state.capacity}` : null;
  });

  protected readonly methodView = computed(() => {
    const card = this.paymentOverview()?.card ?? null;
    return card ? buildPaymentMethodView(card) : null;
  });

  protected readonly nextInvoiceLabel = computed(() => {
    const iso = this.paymentOverview()?.nextInvoiceDate;
    return iso ? formatDayMonthYear(iso) : null;
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
    const renewal = this.renewalLabel();
    const invoice = this.nextInvoiceLabel() ?? renewal;
    if (section === 'plan') {
      return {
        text: renewal ? `Prochain renouvellement le ${renewal}` : '',
        tone: 'idle',
      };
    }
    return {
      text: invoice ? `Prochaine facture le ${invoice}` : '',
      tone: 'idle',
    };
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
    this.authFacade.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }

}
