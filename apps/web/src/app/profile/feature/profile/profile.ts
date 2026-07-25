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
  PaymentMethodOverviewDto,
  Sector,
  SubscriptionTier,
} from '@psychotech/shared';
import {
  Check,
  CreditCard,
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
import { SUBSCRIPTION_MONTHLY_PRICES } from '../../../shared/util/subscription-prices';
import { inputValue } from '../../../shared/util/input-value';

type ProfileSection = 'account' | 'sector' | 'plan' | 'billing';

interface ProfileSectionMeta {
  title: string;
  description: string;
}

const SECTION_META: Record<ProfileSection, ProfileSectionMeta> = {
  account: {
    title: 'Informations personnelles',
    description: 'Votre identité et votre adresse de connexion.',
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
    name: 'Découverte',
    description: 'Mode découverte de chaque axe, en libre accès.',
  },
  [SubscriptionTier.ESSENTIAL]: {
    name: 'Essentiel',
    description: '5 énergies par jour, rechargées à minuit.',
  },
  [SubscriptionTier.UNLIMITED]: {
    name: 'Illimité',
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

function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RouterLink],
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

  protected readonly canSave = computed(
    () =>
      this.dirty() &&
      !this.saving() &&
      this.firstName().trim().length > 0 &&
      this.lastName().trim().length > 0,
  );

  protected readonly memberSince = computed(() => {
    const created = this.user()?.createdAt;
    return created ? formatLongDate(created) : '';
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
    return periodEnd ? formatLongDate(periodEnd) : null;
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
    return iso ? formatLongDate(iso) : null;
  });

  protected readonly status = computed<{
    text: string;
    tone: 'idle' | 'dirty' | 'saved';
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
  }

  protected save(): void {
    if (!this.canSave()) {
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
          this.saved.set(true);
          if (this.savedTimer) {
            clearTimeout(this.savedTimer);
          }
          this.savedTimer = setTimeout(
            () => this.saved.set(false),
            SAVED_STATUS_DURATION_MS,
          );
        },
        error: () => this.saving.set(false),
      });
  }

  protected logout(): void {
    this.authFacade.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }

}
