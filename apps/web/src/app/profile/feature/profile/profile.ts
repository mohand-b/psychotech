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
  BillingInvoiceDto,
  BillingPeriod,
  INVALID_CURRENT_PASSWORD_ERROR_CODE,
  InvoiceStatus,
  PASSWORD_MIN_LENGTH,
  PaymentMethodOverviewDto,
  Sector,
  SubscriptionTier,
} from '@psychotech/shared';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ArrowLeft,
  Check,
  CreditCard,
  Lock,
  LogOut,
  LucideIconData,
  ShieldCheck,
  User,
} from 'lucide-angular';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { CatalogFacade } from '../../../catalog/data-access/catalog.facade';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { ProgressionFacade } from '../../../progression/data-access/progression.facade';
import { SubscriptionsFacade } from '../../../subscriptions/data-access/subscriptions.facade';
import { PLAN_SLUGS } from '../../../subscriptions/plan-slug';
import { Badge } from '../../../shared/ui/badge/badge';
import { EnergyChip } from '../../../shared/ui/energy-chip/energy-chip';
import { Icon } from '../../../shared/ui/icon/icon';
import { SECTOR_PRESENTATION } from '../../../shared/ui/sector-presentation';
import { buildPaymentMethodView } from '../../../shared/ui/payment-method-view';
import { PasswordStrengthMeter } from '../../../shared/ui/password-strength-meter/password-strength-meter';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { formatDayMonthYear } from '../../../shared/util/format-day-month-year';
import { PLAN_LABELS } from '../../../shared/util/plan-labels';
import { formatEuroAmount } from '../../../shared/util/subscription-prices';
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

const PLAN_COPY: Record<
  SubscriptionTier,
  { name: string; description: string; energy: string }
> = {
  [SubscriptionTier.FREE]: {
    name: PLAN_LABELS[SubscriptionTier.FREE],
    description: 'Mode découverte de chaque axe, sans évaluation enregistrée.',
    energy: 'Mode découverte seul',
  },
  [SubscriptionTier.ESSENTIAL]: {
    name: PLAN_LABELS[SubscriptionTier.ESSENTIAL],
    description: '5 énergies par jour : une simulation complète ou cinq axes.',
    energy: '5 par jour',
  },
  [SubscriptionTier.UNLIMITED]: {
    name: PLAN_LABELS[SubscriptionTier.UNLIMITED],
    description: 'Énergie illimitée, tous les axes et toutes les simulations.',
    energy: 'Illimitée',
  },
};

const SAVED_STATUS_DURATION_MS = 3200;

const INVOICE_STATUS_PRESENTATION: Record<
  InvoiceStatus,
  { label: string; colorVar: string }
> = {
  [InvoiceStatus.PAID]: { label: 'Payée', colorVar: 'var(--success-text)' },
  [InvoiceStatus.OPEN]: { label: 'À régler', colorVar: 'var(--warning-text)' },
  [InvoiceStatus.VOID]: { label: 'Annulée', colorVar: 'var(--label)' },
  [InvoiceStatus.UNCOLLECTIBLE]: {
    label: 'Impayée',
    colorVar: 'var(--danger-text)',
  },
};

interface InvoiceRowView {
  id: string;
  dateLabel: string;
  label: string;
  amountLabel: string;
  statusLabel: string;
  statusColorVar: string;
  url: string | null;
}

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Badge,
    EnergyChip,
    Icon,
    PasswordStrengthMeter,
    RouterLink,
    Skeleton,
  ],
  providers: [ProgressionFacade],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  private readonly authFacade = inject(AuthFacade);
  private readonly catalogFacade = inject(CatalogFacade);
  private readonly coreFacade = inject(CoreFacade);
  private readonly energyFacade = inject(EnergyFacade);
  private readonly progressionFacade = inject(ProgressionFacade);
  private readonly subscriptionsFacade = inject(SubscriptionsFacade);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly accountIcon = User;
  protected readonly securityIcon = Lock;
  protected readonly planIcon = ShieldCheck;
  protected readonly billingIcon = CreditCard;
  protected readonly logoutIcon = LogOut;
  protected readonly checkIcon = Check;
  protected readonly backIcon = ArrowLeft;

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
  protected readonly paymentLoading = signal(false);
  protected readonly invoices = signal<BillingInvoiceDto[] | null>(null);
  protected readonly invoicesError = signal(false);
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
      this.paymentLoading.set(true);
      this.subscriptionsFacade
        .getPaymentMethodOverview()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (overview) => {
            this.paymentOverview.set(overview);
            this.paymentLoading.set(false);
          },
          error: () => {
            this.paymentOverview.set(null);
            this.paymentLoading.set(false);
          },
        });
      this.loadInvoices();
    }
    this.destroyRef.onDestroy(() => {
      if (this.savedTimer) {
        clearTimeout(this.savedTimer);
      }
    });
  }

  protected loadInvoices(): void {
    this.invoicesError.set(false);
    this.invoices.set(null);
    this.subscriptionsFacade
      .listInvoices()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (invoices) => this.invoices.set(invoices),
        error: () => {
          this.invoices.set([]);
          this.invoicesError.set(true);
        },
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

  protected readonly planPrice = computed<{
    label: string;
    mono: boolean;
    period: string | null;
  }>(() => {
    const tier = this.tier();
    return tier === SubscriptionTier.FREE
      ? { label: 'Gratuit', mono: false, period: null }
      : {
          label: `${SUBSCRIPTION_MONTHLY_PRICES[tier]} €`,
          mono: true,
          period: 'par mois',
        };
  });

  protected readonly renewalLabel = computed(() => {
    const periodEnd = this.user()?.subscription?.currentPeriodEnd;
    return periodEnd ? formatDayMonthYear(periodEnd) : null;
  });

  protected readonly planBillingLabel = computed(() => {
    const period = this.user()?.subscription?.billingPeriod;
    return period === BillingPeriod.ANNUAL
      ? 'Annuelle'
      : period === BillingPeriod.MONTHLY
        ? 'Mensuelle'
        : 'Aucune';
  });

  protected readonly planRenewMeta = computed<{
    label: string;
    value: string;
  } | null>(() => {
    if (this.tier() === SubscriptionTier.FREE) {
      return { label: 'Durée', value: 'Sans limite' };
    }
    const renewal = this.renewalLabel();
    return renewal
      ? { label: 'Prochain renouvellement', value: renewal }
      : null;
  });

  protected readonly planCta = computed<{ label: string; link: string }>(() => {
    const tier = this.tier();
    if (tier === SubscriptionTier.FREE) {
      return { label: 'Choisir une formule', link: '/abonnements' };
    }
    if (tier === SubscriptionTier.ESSENTIAL) {
      return {
        label: "Passer à l'Illimité",
        link: `/paiement/${PLAN_SLUGS[SubscriptionTier.UNLIMITED]}`,
      };
    }
    return { label: "Changer d'offre", link: '/abonnements' };
  });

  protected readonly subscriptionEnding = computed(
    () => this.user()?.subscription?.cancelAtPeriodEnd === true,
  );

  protected readonly cancelRow = computed<{
    title: string;
    description: string;
    ctaLabel: string;
  } | null>(() => {
    if (this.tier() === SubscriptionTier.FREE) {
      return null;
    }
    const renewal = this.renewalLabel();
    if (this.subscriptionEnding()) {
      return {
        title: 'Abonnement résilié',
        description: renewal
          ? `Votre abonnement prend fin le ${renewal}. Vous pouvez le reprendre jusqu'à cette date, votre progression est conservée.`
          : 'Votre abonnement prend fin à la fin de la période payée. Vous pouvez le reprendre jusque-là, votre progression est conservée.',
        ctaLabel: 'Reprendre',
      };
    }
    return {
      title: 'Résilier mon abonnement',
      description: renewal
        ? `La résiliation prend effet le ${renewal}, fin de la période payée. Votre progression est conservée.`
        : 'La résiliation prend effet à la fin de la période payée. Votre progression est conservée.',
      ctaLabel: 'Résilier',
    };
  });

  protected readonly methodView = computed(() => {
    const card = this.paymentOverview()?.card ?? null;
    return card ? buildPaymentMethodView(card) : null;
  });

  protected readonly nextInvoiceLabel = computed(() => {
    const iso = this.paymentOverview()?.nextInvoiceDate;
    return iso ? formatDayMonthYear(iso) : null;
  });

  protected readonly invoiceRows = computed<InvoiceRowView[]>(() =>
    (this.invoices() ?? []).map((invoice) => ({
      id: invoice.id,
      dateLabel: new Date(invoice.createdAt).toLocaleDateString('fr-FR'),
      label: invoice.tier
        ? `${PLAN_LABELS[invoice.tier]}, mensuel`
        : 'Abonnement',
      amountLabel: `${formatEuroAmount(invoice.amount / 100)} €`,
      statusLabel: INVOICE_STATUS_PRESENTATION[invoice.status].label,
      statusColorVar: INVOICE_STATUS_PRESENTATION[invoice.status].colorVar,
      url: invoice.url,
    })),
  );

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
    if (this.tier() === SubscriptionTier.FREE) {
      return { text: 'Aucune facturation en cours', tone: 'idle' };
    }
    if (this.subscriptionEnding()) {
      const renewal = this.renewalLabel();
      return {
        text: renewal ? `Votre abonnement prend fin le ${renewal}` : '',
        tone: 'idle',
      };
    }
    const invoice = this.nextInvoiceLabel() ?? this.renewalLabel();
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
