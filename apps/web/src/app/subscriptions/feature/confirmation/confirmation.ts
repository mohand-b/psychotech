import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PaidTier, SubscriptionTier } from '@psychotech/shared';
import { ArrowRight, Check } from 'lucide-angular';
import { catchError, of, switchMap, take, takeWhile, timer } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { BoltIcon } from '../../../shared/ui/bolt-icon/bolt-icon';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { SUBSCRIPTION_MONTHLY_PRICES } from '../../../shared/util/subscription-prices';
import { SubscriptionsFacade } from '../../data-access/subscriptions.facade';
import { planFromSlug } from '../../plan-slug';

const PLAN_LABELS: Record<PaidTier, string> = {
  [SubscriptionTier.ESSENTIAL]: 'Essentiel',
  [SubscriptionTier.UNLIMITED]: 'Illimité',
};

const ACTIVATION_POLL_INTERVAL_MS = 2000;
const ACTIVATION_POLL_MAX_ATTEMPTS = 15;

function formatDayMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

@Component({
  selector: 'app-subscription-confirmation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BoltIcon, Button, Icon, RouterLink],
  templateUrl: './confirmation.html',
  styleUrl: './confirmation.css',
})
export class SubscriptionConfirmation {
  private readonly authFacade = inject(AuthFacade);
  private readonly subscriptionsFacade = inject(SubscriptionsFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly checkIcon = Check;
  protected readonly arrowIcon = ArrowRight;

  protected readonly plan: PaidTier;
  protected readonly isPlanChange: boolean;
  protected readonly isResume: boolean;

  constructor() {
    const mode = this.route.snapshot.queryParamMap.get('mode');
    this.isPlanChange = mode === 'changement';
    this.isResume = mode === 'reprise';
    const fromQuery = planFromSlug(
      this.route.snapshot.queryParamMap.get('offre'),
    );
    const currentTier = this.authFacade.currentUser()?.tier;
    const fromTier =
      currentTier && currentTier !== SubscriptionTier.FREE
        ? currentTier
        : null;
    const plan = fromQuery ?? fromTier;
    if (!plan) {
      this.plan = SubscriptionTier.ESSENTIAL;
      this.router.navigate(['/abonnements']);
      return;
    }
    this.plan = plan;
    this.pollActivation();
  }

  protected readonly planLabel = computed(() => PLAN_LABELS[this.plan]);
  protected readonly priceLabel = computed(
    () => SUBSCRIPTION_MONTHLY_PRICES[this.plan],
  );

  protected readonly nextBillingLabel = computed(() => {
    const subscription = this.authFacade.currentUser()?.subscription;
    return subscription?.currentPeriodEnd && !subscription.cancelAtPeriodEnd
      ? formatDayMonthYear(subscription.currentPeriodEnd)
      : null;
  });

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
      .subscribe();
  }
}
