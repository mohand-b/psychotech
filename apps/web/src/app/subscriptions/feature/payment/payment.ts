import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  PaidTier,
  PromotionCodeDto,
  PromotionDuration,
  SubscriptionTier,
} from '@psychotech/shared';
import { CircleAlert, Lock, ShieldCheck, Tag, X, Zap } from 'lucide-angular';
import { finalize } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import {
  SUBSCRIPTION_MONTHLY_PRICE_EUR,
  formatEuroAmount,
} from '../../../shared/util/subscription-prices';
import { SubscriptionsFacade } from '../../data-access/subscriptions.facade';
import { planFromSlug } from '../../plan-slug';

const PLAN_PRESENTATION: Record<
  PaidTier,
  { label: string; description: string }
> = {
  [SubscriptionTier.ESSENTIAL]: {
    label: 'Essentiel',
    description: '5 énergies par jour, résultats détaillés, progression',
  },
  [SubscriptionTier.UNLIMITED]: {
    label: 'Illimité',
    description: 'Énergie illimitée, préparation intensive',
  },
};

function formatDayMonthYear(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

@Component({
  selector: 'app-payment',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, RouterLink],
  templateUrl: './payment.html',
  styleUrl: './payment.css',
})
export class Payment {
  private readonly coreFacade = inject(CoreFacade);
  private readonly authFacade = inject(AuthFacade);
  private readonly subscriptionsFacade = inject(SubscriptionsFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  protected readonly boltIcon = Zap;
  protected readonly lockIcon = Lock;
  protected readonly shieldIcon = ShieldCheck;
  protected readonly tagIcon = Tag;
  protected readonly removeIcon = X;
  protected readonly errorIcon = CircleAlert;

  protected readonly plan: PaidTier;

  constructor() {
    const plan = planFromSlug(this.route.snapshot.paramMap.get('plan'));
    if (!plan || this.coreFacade.tier() !== SubscriptionTier.FREE) {
      this.plan = plan ?? SubscriptionTier.ESSENTIAL;
      this.router.navigate(['/abonnements']);
      return;
    }
    this.plan = plan;
  }

  protected readonly presentation = computed(
    () => PLAN_PRESENTATION[this.plan],
  );
  protected readonly email = computed(
    () => this.authFacade.currentUser()?.email ?? '',
  );

  protected readonly code = signal('');
  protected readonly codeError = signal(false);
  protected readonly applying = signal(false);
  protected readonly promotion = signal<PromotionCodeDto | null>(null);
  protected readonly redirecting = signal(false);

  private readonly price = computed(
    () => SUBSCRIPTION_MONTHLY_PRICE_EUR[this.plan],
  );

  private readonly discount = computed(() => {
    const promotion = this.promotion();
    if (!promotion) {
      return 0;
    }
    if (promotion.percentOff !== null) {
      return (this.price() * promotion.percentOff) / 100;
    }
    if (promotion.amountOff !== null) {
      return Math.min(this.price(), promotion.amountOff / 100);
    }
    return 0;
  });

  private readonly total = computed(() =>
    Math.max(0, this.price() - this.discount()),
  );

  protected readonly priceLabel = computed(() =>
    formatEuroAmount(this.price()),
  );
  protected readonly totalLabel = computed(() =>
    formatEuroAmount(this.total()),
  );
  protected readonly showDiscountRow = computed(
    () => this.discount() > 0 && this.total() > 0,
  );
  protected readonly discountLabel = computed(
    () => `−${formatEuroAmount(this.discount())}`,
  );

  protected readonly promotionLabel = computed(() => {
    const promotion = this.promotion();
    if (!promotion) {
      return '';
    }
    if (
      promotion.percentOff === 100 &&
      promotion.duration === PromotionDuration.ONCE
    ) {
      return '1er mois offert';
    }
    const amount =
      promotion.percentOff !== null
        ? `−${promotion.percentOff} %`
        : `−${formatEuroAmount((promotion.amountOff ?? 0) / 100)} €`;
    if (promotion.duration === PromotionDuration.REPEATING) {
      return `${amount} pendant ${promotion.durationInMonths} mois`;
    }
    if (promotion.duration === PromotionDuration.FOREVER) {
      return `${amount} à vie`;
    }
    return `${amount} sur le premier mois`;
  });

  protected readonly nextNote = computed(() => {
    const promotion = this.promotion();
    if (!promotion) {
      return null;
    }
    const fullPrice = `${formatEuroAmount(this.price())} €`;
    if (this.total() === 0) {
      const nextBilling = new Date();
      nextBilling.setMonth(nextBilling.getMonth() + 1);
      return `Puis ${fullPrice}/mois à partir du ${formatDayMonthYear(nextBilling)}.`;
    }
    if (promotion.duration === PromotionDuration.REPEATING) {
      return `Puis ${formatEuroAmount(this.total())} €/mois pendant ${promotion.durationInMonths} mois, ensuite ${fullPrice}/mois.`;
    }
    if (promotion.duration === PromotionDuration.ONCE) {
      return `Puis ${fullPrice}/mois dès le mois suivant.`;
    }
    return null;
  });

  protected onCodeInput(value: string): void {
    this.code.set(value.toUpperCase());
    this.codeError.set(false);
  }

  protected applyCode(): void {
    const code = this.code().trim();
    if (!code || this.applying()) {
      return;
    }
    this.applying.set(true);
    this.subscriptionsFacade
      .validatePromotionCode(code)
      .pipe(finalize(() => this.applying.set(false)))
      .subscribe({
        next: (promotion) => {
          this.promotion.set(promotion);
          this.code.set('');
          this.codeError.set(false);
        },
        error: () => this.codeError.set(true),
      });
  }

  protected removeCode(): void {
    this.promotion.set(null);
  }

  protected pay(): void {
    if (this.redirecting()) {
      return;
    }
    this.redirecting.set(true);
    this.subscriptionsFacade
      .startCheckout(this.plan, this.promotion()?.code)
      .subscribe({
        next: ({ url }) => this.document.location.assign(url),
        error: () => this.redirecting.set(false),
      });
  }
}
