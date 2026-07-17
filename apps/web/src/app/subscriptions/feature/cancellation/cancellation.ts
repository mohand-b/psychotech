import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PaidTier, SubscriptionTier } from '@psychotech/shared';
import { ArrowRight, CalendarCheck } from 'lucide-angular';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { BoltIcon } from '../../../shared/ui/bolt-icon/bolt-icon';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { SubscriptionsFacade } from '../../data-access/subscriptions.facade';
import { PLAN_SLUGS } from '../../plan-slug';

const PLAN_LABELS: Record<PaidTier, string> = {
  [SubscriptionTier.ESSENTIAL]: 'Essentiel',
  [SubscriptionTier.UNLIMITED]: 'Illimité',
};

function formatDayMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

@Component({
  selector: 'app-subscription-cancellation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BoltIcon, Button, Icon, RouterLink],
  templateUrl: './cancellation.html',
  styleUrl: './cancellation.css',
})
export class SubscriptionCancellation {
  private readonly authFacade = inject(AuthFacade);
  private readonly subscriptionsFacade = inject(SubscriptionsFacade);
  private readonly router = inject(Router);

  protected readonly badgeIcon = CalendarCheck;
  protected readonly arrowIcon = ArrowRight;

  protected readonly resuming = signal(false);

  constructor() {
    const subscription = this.authFacade.currentUser()?.subscription;
    if (!subscription?.cancelAtPeriodEnd) {
      this.router.navigate(['/abonnements']);
    }
  }

  private readonly subscription = computed(
    () => this.authFacade.currentUser()?.subscription ?? null,
  );

  protected readonly planLabel = computed(() => {
    const tier = this.subscription()?.tier;
    return tier && tier !== SubscriptionTier.FREE
      ? PLAN_LABELS[tier as PaidTier]
      : '';
  });

  protected readonly endDateLabel = computed(() => {
    const iso = this.subscription()?.currentPeriodEnd;
    return iso ? formatDayMonthYear(iso) : null;
  });

  protected resume(): void {
    if (this.resuming()) {
      return;
    }
    this.resuming.set(true);
    const tier = this.subscription()?.tier;
    const slug =
      tier && tier !== SubscriptionTier.FREE
        ? PLAN_SLUGS[tier as PaidTier]
        : PLAN_SLUGS[SubscriptionTier.ESSENTIAL];
    this.subscriptionsFacade.resumeSubscription().subscribe({
      next: () =>
        this.router.navigate(['/abonnement-confirme'], {
          queryParams: { offre: slug, mode: 'reprise' },
        }),
      error: () => this.resuming.set(false),
    });
  }
}
