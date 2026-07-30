import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import {
  FULL_SESSION_LABEL,
  PaidTier,
  SubscriptionStatus,
  SubscriptionTier,
} from '@psychotech/shared';
import { ArrowRight, Check, Minus } from 'lucide-angular';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { SubscriptionsFacade } from '../../data-access/subscriptions.facade';
import { PLAN_SLUGS } from '../../plan-slug';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { formatDayMonthYear } from '../../../shared/util/format-day-month-year';
import { PLAN_LABELS } from '../../../shared/util/plan-labels';
import { SUBSCRIPTION_MONTHLY_PRICES } from '../../../shared/util/subscription-prices';

interface CompareCell {
  kind: 'check' | 'dash' | 'mono';
  value?: string;
}

interface CompareRow {
  label: string;
  mobileLabel: string;
  desktop: [CompareCell, CompareCell, CompareCell];
  mobile: [CompareCell, CompareCell, CompareCell];
}

const CHECK: CompareCell = { kind: 'check' };
const DASH: CompareCell = { kind: 'dash' };
const mono = (value: string): CompareCell => ({ kind: 'mono', value });

@Component({
  selector: 'app-offers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, RouterLink],
  templateUrl: './offers.html',
  styleUrl: './offers.css',
})
export class Offers {
  private readonly coreFacade = inject(CoreFacade);
  private readonly subscriptionsFacade = inject(SubscriptionsFacade);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly managing = signal(false);
  protected readonly pendingCancel = signal(false);

  protected readonly checkIcon = Check;
  protected readonly dashIcon = Minus;
  protected readonly arrowIcon = ArrowRight;

  protected readonly tiers = SubscriptionTier;
  protected readonly tier = this.coreFacade.tier;
  protected readonly prices = SUBSCRIPTION_MONTHLY_PRICES;
  private readonly billing = this.subscriptionsFacade.billingOverview;

  constructor() {
    this.subscriptionsFacade
      .refreshTier()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
    this.subscriptionsFacade
      .loadBillingOverview(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }

  protected readonly isFreeCurrent = computed(
    () => this.tier() === SubscriptionTier.FREE,
  );
  protected readonly isEssentialCurrent = computed(
    () => this.tier() === SubscriptionTier.ESSENTIAL,
  );
  protected readonly isUnlimitedCurrent = computed(
    () => this.tier() === SubscriptionTier.UNLIMITED,
  );

  protected readonly subscriptionEndsAt = computed(() => {
    const overview = this.billing();
    return overview?.cancelAtPeriodEnd && overview.currentPeriodEnd
      ? formatDayMonthYear(overview.currentPeriodEnd)
      : null;
  });

  protected readonly renewalDate = computed(() => {
    const periodEnd = this.billing()?.currentPeriodEnd;
    return periodEnd ? formatDayMonthYear(periodEnd) : null;
  });

  protected readonly paymentPastDue = computed(
    () => this.billing()?.status === SubscriptionStatus.PAST_DUE,
  );

  protected readonly isPaidCurrent = computed(() => {
    const tier = this.tier();
    return (
      tier === SubscriptionTier.ESSENTIAL || tier === SubscriptionTier.UNLIMITED
    );
  });

  protected readonly unlimitedCardNote = computed(() => {
    if (
      !this.isUnlimitedCurrent() ||
      (this.pendingChange() === null && this.subscriptionEndsAt() === null)
    ) {
      return null;
    }
    const until = this.renewalDate();
    if (!until) {
      return null;
    }
    return this.subscriptionEndsAt()
      ? `Accès jusqu'au ${until}`
      : `Actif jusqu'au ${until}`;
  });

  protected readonly essentialCardNote = computed(() => {
    if (!this.isEssentialCurrent()) {
      return null;
    }
    const endsAt = this.subscriptionEndsAt();
    if (endsAt) {
      return `Accès jusqu'au ${endsAt}`;
    }
    const renewal = this.renewalDate();
    return renewal ? `Renouvellement le ${renewal}` : null;
  });

  protected readonly manageNote = computed(() => {
    const pending = this.pendingChange();
    if (pending) {
      return `Passage à l'${pending.label} programmé le ${pending.date}, annulable jusque-là. Votre progression est conservée.`;
    }
    const endsAt = this.subscriptionEndsAt();
    if (endsAt) {
      return `Votre abonnement prend fin le ${endsAt}. Vous pouvez le réactiver jusqu'à cette date, votre progression est conservée.`;
    }
    return 'La résiliation prend effet en fin de période payée, votre progression est conservée.';
  });

  protected readonly pendingChange = computed(() => {
    const overview = this.billing();
    return overview?.pendingTier && overview.currentPeriodEnd
      ? {
          tier: overview.pendingTier,
          label: PLAN_LABELS[overview.pendingTier],
          date: formatDayMonthYear(overview.currentPeriodEnd),
        }
      : null;
  });

  protected readonly currentPlanBadge = computed(() => {
    if (this.subscriptionEndsAt()) {
      return 'Résiliation programmée';
    }
    if (this.paymentPastDue()) {
      return 'Paiement en échec';
    }
    return 'Votre formule actuelle';
  });

  protected readonly unlimitedBadge = computed(() =>
    this.isUnlimitedCurrent()
      ? this.currentPlanBadge()
      : 'Recommandé pour la préparation intensive',
  );

  protected readonly compareRows: CompareRow[] = [
    {
      label: 'Mode découverte des axes',
      mobileLabel: 'Mode découverte',
      desktop: [CHECK, CHECK, CHECK],
      mobile: [CHECK, CHECK, CHECK],
    },
    {
      label: 'Énergie par jour',
      mobileLabel: 'Énergie / jour',
      desktop: [DASH, mono('5/jour'), mono('Illimité')],
      mobile: [DASH, mono('5'), mono('∞')],
    },
    {
      label: FULL_SESSION_LABEL,
      mobileLabel: 'Coût examen blanc',
      desktop: [DASH, mono('5 énergies'), mono('Illimité')],
      mobile: [DASH, mono('5'), mono('∞')],
    },
    {
      label: 'Axes individuels',
      mobileLabel: "Coût d'un axe",
      desktop: [DASH, mono('1 énergie'), mono('Illimité')],
      mobile: [DASH, mono('1'), mono('∞')],
    },
    {
      label: 'Exercices renouvelés à chaque session',
      mobileLabel: 'Exercices renouvelés',
      desktop: [DASH, CHECK, CHECK],
      mobile: [DASH, CHECK, CHECK],
    },
    {
      label: 'Résultats détaillés & recommandations',
      mobileLabel: 'Résultats détaillés',
      desktop: [DASH, CHECK, CHECK],
      mobile: [DASH, CHECK, CHECK],
    },
    {
      label: 'Suivi de progression',
      mobileLabel: 'Suivi de progression',
      desktop: [DASH, CHECK, CHECK],
      mobile: [DASH, CHECK, CHECK],
    },
  ];

  protected choosePlan(plan: PaidTier): void {
    if (
      this.managing() ||
      plan === this.tier() ||
      plan === this.pendingChange()?.tier
    ) {
      return;
    }
    this.router.navigate(['/paiement', PLAN_SLUGS[plan]]);
  }

  protected cancelPlanChange(): void {
    if (this.managing()) {
      return;
    }
    this.managing.set(true);
    this.subscriptionsFacade
      .cancelPlanChange()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.managing.set(false),
        error: () => this.managing.set(false),
      });
  }

  protected cancelSubscription(): void {
    if (this.managing()) {
      return;
    }
    if (!this.pendingCancel()) {
      this.pendingCancel.set(true);
      return;
    }
    this.managing.set(true);
    this.subscriptionsFacade
      .cancelSubscription()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.managing.set(false);
          this.pendingCancel.set(false);
        },
        error: () => {
          this.managing.set(false);
          this.pendingCancel.set(false);
        },
      });
  }

  protected resumeSubscription(): void {
    if (this.managing()) {
      return;
    }
    this.managing.set(true);
    this.subscriptionsFacade
      .resumeSubscription()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.managing.set(false),
        error: () => this.managing.set(false),
      });
  }

  protected cancelLabel(): string {
    return this.pendingCancel()
      ? 'Confirmer la résiliation'
      : 'Résilier mon abonnement';
  }
}
