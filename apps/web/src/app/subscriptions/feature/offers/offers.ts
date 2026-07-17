import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PaidTier, SubscriptionTier } from '@psychotech/shared';
import { ArrowRight, Check, Minus } from 'lucide-angular';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { SubscriptionsFacade } from '../../data-access/subscriptions.facade';
import { PLAN_SLUGS } from '../../plan-slug';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
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

type OffersBanner =
  | 'planChanged'
  | 'cancelScheduled'
  | 'resumed'
  | 'cardUpdated';

const CHECK: CompareCell = { kind: 'check' };
const DASH: CompareCell = { kind: 'dash' };
const mono = (value: string): CompareCell => ({ kind: 'mono', value });

function formatDayMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

@Component({
  selector: 'app-offers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, RouterLink],
  templateUrl: './offers.html',
  styleUrl: './offers.css',
})
export class Offers {
  private readonly coreFacade = inject(CoreFacade);
  private readonly authFacade = inject(AuthFacade);
  private readonly subscriptionsFacade = inject(SubscriptionsFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly changingPlan = signal(false);
  protected readonly pendingPlanChange = signal<PaidTier | null>(null);
  protected readonly managing = signal(false);
  protected readonly pendingCancel = signal(false);
  protected readonly banner = signal<OffersBanner | null>(null);

  protected readonly checkIcon = Check;
  protected readonly dashIcon = Minus;
  protected readonly arrowIcon = ArrowRight;

  protected readonly tiers = SubscriptionTier;
  protected readonly tier = this.coreFacade.tier;
  protected readonly prices = SUBSCRIPTION_MONTHLY_PRICES;

  constructor() {
    if (this.route.snapshot.queryParamMap.get('carte') === 'maj') {
      this.banner.set('cardUpdated');
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { carte: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
    this.subscriptionsFacade
      .refreshTier()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
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
    const subscription = this.authFacade.currentUser()?.subscription;
    return subscription?.cancelAtPeriodEnd && subscription.currentPeriodEnd
      ? formatDayMonthYear(subscription.currentPeriodEnd)
      : null;
  });

  protected readonly unlimitedBadge = computed(() =>
    this.isUnlimitedCurrent()
      ? 'Votre formule actuelle'
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
      label: 'Simulation complète',
      mobileLabel: 'Coût simulation',
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
    if (this.changingPlan() || this.managing()) {
      return;
    }
    if (this.isFreeCurrent()) {
      this.router.navigate(['/paiement', PLAN_SLUGS[plan]]);
      return;
    }
    if (this.pendingPlanChange() !== plan) {
      this.pendingPlanChange.set(plan);
      this.pendingCancel.set(false);
      return;
    }
    this.changingPlan.set(true);
    this.subscriptionsFacade.changePlan(plan).subscribe({
      next: () => {
        this.changingPlan.set(false);
        this.pendingPlanChange.set(null);
        this.banner.set('planChanged');
      },
      error: () => {
        this.changingPlan.set(false);
        this.pendingPlanChange.set(null);
      },
    });
  }

  protected planChangeLabel(plan: PaidTier, defaultLabel: string): string {
    return this.pendingPlanChange() === plan
      ? 'Confirmer le changement'
      : defaultLabel;
  }

  protected cancelSubscription(): void {
    if (this.managing() || this.changingPlan()) {
      return;
    }
    if (!this.pendingCancel()) {
      this.pendingCancel.set(true);
      this.pendingPlanChange.set(null);
      return;
    }
    this.managing.set(true);
    this.subscriptionsFacade.cancelSubscription().subscribe({
      next: () => {
        this.managing.set(false);
        this.pendingCancel.set(false);
        this.banner.set('cancelScheduled');
      },
      error: () => {
        this.managing.set(false);
        this.pendingCancel.set(false);
      },
    });
  }

  protected resumeSubscription(): void {
    if (this.managing() || this.changingPlan()) {
      return;
    }
    this.managing.set(true);
    this.subscriptionsFacade.resumeSubscription().subscribe({
      next: () => {
        this.managing.set(false);
        this.banner.set('resumed');
      },
      error: () => this.managing.set(false),
    });
  }

  protected cancelLabel(): string {
    return this.pendingCancel()
      ? 'Confirmer la résiliation'
      : 'Résilier mon abonnement';
  }
}
