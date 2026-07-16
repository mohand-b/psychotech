import { DOCUMENT } from '@angular/common';
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
import { PaidTier, SubscriptionTier } from '@psychotech/shared';
import { ArrowRight, Check, Minus } from 'lucide-angular';
import { catchError, of, switchMap, take, takeWhile, timer } from 'rxjs';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { SubscriptionsFacade } from '../../data-access/subscriptions.facade';
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

type CheckoutBanner = 'activating' | 'activated' | 'timeout' | 'cancelled';

const CHECK: CompareCell = { kind: 'check' };
const DASH: CompareCell = { kind: 'dash' };
const mono = (value: string): CompareCell => ({ kind: 'mono', value });

const ACTIVATION_POLL_INTERVAL_MS = 2000;
const ACTIVATION_POLL_MAX_ATTEMPTS = 15;

@Component({
  selector: 'app-offers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon],
  templateUrl: './offers.html',
  styleUrl: './offers.css',
})
export class Offers {
  private readonly coreFacade = inject(CoreFacade);
  private readonly subscriptionsFacade = inject(SubscriptionsFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly redirecting = signal<PaidTier | 'portal' | null>(null);
  protected readonly banner = signal<CheckoutBanner | null>(null);

  protected readonly checkIcon = Check;
  protected readonly dashIcon = Minus;
  protected readonly arrowIcon = ArrowRight;

  protected readonly tiers = SubscriptionTier;
  protected readonly tier = this.coreFacade.tier;
  protected readonly prices = SUBSCRIPTION_MONTHLY_PRICES;

  constructor() {
    const checkout = this.route.snapshot.queryParamMap.get('checkout');
    if (checkout === 'success') {
      this.banner.set('activating');
      this.pollActivation();
      this.clearCheckoutParam();
    } else if (checkout === 'cancelled') {
      this.banner.set('cancelled');
      this.clearCheckoutParam();
    } else {
      this.subscriptionsFacade
        .refreshTier()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
    }
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
    if (this.redirecting() !== null) {
      return;
    }
    if (this.isFreeCurrent()) {
      this.redirecting.set(plan);
      this.subscriptionsFacade.startCheckout(plan).subscribe({
        next: ({ url }) => this.document.location.assign(url),
        error: () => this.redirecting.set(null),
      });
      return;
    }
    this.openPortal();
  }

  protected openPortal(): void {
    if (this.redirecting() !== null) {
      return;
    }
    this.redirecting.set('portal');
    this.subscriptionsFacade.openPortal().subscribe({
      next: ({ url }) => this.document.location.assign(url),
      error: () => this.redirecting.set(null),
    });
  }

  private pollActivation(): void {
    timer(0, ACTIVATION_POLL_INTERVAL_MS)
      .pipe(
        take(ACTIVATION_POLL_MAX_ATTEMPTS),
        switchMap(() =>
          this.subscriptionsFacade
            .refreshTier()
            .pipe(catchError(() => of(SubscriptionTier.FREE))),
        ),
        takeWhile((tier) => tier === SubscriptionTier.FREE, true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (tier) => {
          if (tier !== SubscriptionTier.FREE) {
            this.banner.set('activated');
          }
        },
        complete: () => {
          if (this.banner() === 'activating') {
            this.banner.set('timeout');
          }
        },
      });
  }

  private clearCheckoutParam(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { checkout: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
