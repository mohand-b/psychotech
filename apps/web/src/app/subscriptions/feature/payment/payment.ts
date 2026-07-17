import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ChangePlanPreviewDto,
  PaidTier,
  PromotionCodeDto,
  PromotionDuration,
  SubscriptionTier,
} from '@psychotech/shared';
import { CircleAlert, Lock, ShieldCheck, Tag, X, Zap } from 'lucide-angular';
import { finalize, firstValueFrom } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import {
  SUBSCRIPTION_MONTHLY_PRICE_EUR,
  formatEuroAmount,
} from '../../../shared/util/subscription-prices';
import { StripePaymentService } from '../../data-access/stripe-payment.service';
import { SubscriptionsFacade } from '../../data-access/subscriptions.facade';
import { PLAN_SLUGS, planFromSlug } from '../../plan-slug';

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

const PAYMENT_FAILED_MESSAGE =
  "Le paiement n'a pas abouti. Vérifiez vos informations et réessayez.";

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
  providers: [StripePaymentService],
  templateUrl: './payment.html',
  styleUrl: './payment.css',
})
export class Payment {
  private readonly coreFacade = inject(CoreFacade);
  private readonly authFacade = inject(AuthFacade);
  private readonly subscriptionsFacade = inject(SubscriptionsFacade);
  private readonly stripePayment = inject(StripePaymentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly boltIcon = Zap;
  protected readonly lockIcon = Lock;
  protected readonly shieldIcon = ShieldCheck;
  protected readonly tagIcon = Tag;
  protected readonly removeIcon = X;
  protected readonly errorIcon = CircleAlert;

  protected readonly plan: PaidTier;
  protected readonly mode: 'checkout' | 'change';

  private readonly paymentElementHost =
    viewChild<ElementRef<HTMLElement>>('paymentElement');

  constructor() {
    const plan = planFromSlug(this.route.snapshot.paramMap.get('plan'));
    const tier = this.coreFacade.tier();
    if (!plan || plan === tier) {
      this.plan = plan ?? SubscriptionTier.ESSENTIAL;
      this.mode = 'checkout';
      this.router.navigate(['/abonnements']);
      return;
    }
    this.plan = plan;
    if (tier === SubscriptionTier.FREE) {
      this.mode = 'checkout';
      afterNextRender(() => void this.setupPaymentElement());
      return;
    }
    this.mode = 'change';
    this.loadChangePreview();
  }

  protected readonly presentation = computed(
    () => PLAN_PRESENTATION[this.plan],
  );
  protected readonly email = computed(
    () => this.authFacade.currentUser()?.email ?? '',
  );

  protected readonly changePreview = signal<ChangePlanPreviewDto | null>(null);
  protected readonly changePreviewFailed = signal(false);
  protected readonly changing = signal(false);
  protected readonly changeError = signal(false);

  protected readonly code = signal('');
  protected readonly codeError = signal(false);
  protected readonly applying = signal(false);
  protected readonly promotion = signal<PromotionCodeDto | null>(null);
  protected readonly holderName = signal('');
  protected readonly paying = signal(false);
  protected readonly paymentError = signal<string | null>(null);
  protected readonly elementReady = signal(false);
  protected readonly elementFailed = signal(false);

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

  private readonly totalCents = computed(() => Math.round(this.total() * 100));

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

  protected readonly payLabel = computed(() =>
    this.total() === 0
      ? "S'abonner — 0,00 € aujourd'hui"
      : `Payer ${formatEuroAmount(this.total())} € et s'abonner`,
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
        ? `−${promotion.percentOff} %`
        : `−${formatEuroAmount((promotion.amountOff ?? 0) / 100)} €`;
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
    const fullPrice = `${formatEuroAmount(this.price())} €`;
    if (this.total() === 0) {
      const nextBilling = new Date();
      nextBilling.setMonth(nextBilling.getMonth() + 1);
      return `Puis ${fullPrice}/mois à partir du ${formatDayMonthYear(nextBilling)}.`;
    }
    if (promotion.duration === PromotionDuration.REPEATING) {
      return `Puis ${formatEuroAmount(this.total())} €/mois pendant ${promotion.durationInMonths} mois, ensuite ${fullPrice}/mois.`;
    }
    if (promotion.duration === PromotionDuration.ONCE) {
      return `Puis ${fullPrice}/mois dès le mois suivant.`;
    }
    return null;
  });

  protected readonly isUpgrade = computed(
    () => this.plan === SubscriptionTier.UNLIMITED,
  );
  protected readonly hasProration = computed(
    () => (this.changePreview()?.prorationAmount ?? 0) > 0,
  );
  protected readonly changeMonthlyLabel = computed(() =>
    formatEuroAmount((this.changePreview()?.monthlyAmount ?? 0) / 100),
  );
  protected readonly prorationLabel = computed(() =>
    formatEuroAmount((this.changePreview()?.prorationAmount ?? 0) / 100),
  );
  protected readonly nextInvoiceLabel = computed(() =>
    formatEuroAmount((this.changePreview()?.nextInvoiceTotal ?? 0) / 100),
  );
  protected readonly nextInvoiceDateLabel = computed(() => {
    const iso = this.changePreview()?.nextInvoiceDate;
    return iso ? formatDayMonthYear(new Date(iso)) : null;
  });
  protected readonly currentPlanLabel = computed(() => {
    const current = this.changePreview()?.currentPlan;
    return current ? PLAN_PRESENTATION[current].label : '';
  });

  private loadChangePreview(): void {
    this.subscriptionsFacade
      .previewPlanChange(this.plan)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (preview) => this.changePreview.set(preview),
        error: () => this.changePreviewFailed.set(true),
      });
  }

  protected confirmChange(): void {
    if (this.changing() || !this.changePreview()) {
      return;
    }
    this.changing.set(true);
    this.changeError.set(false);
    this.subscriptionsFacade.changePlan(this.plan).subscribe({
      next: () =>
        this.router.navigate(['/abonnement-confirme'], {
          queryParams: { offre: PLAN_SLUGS[this.plan], mode: 'changement' },
        }),
      error: () => {
        this.changing.set(false);
        this.changeError.set(true);
      },
    });
  }

  private async setupPaymentElement(): Promise<void> {
    const host = this.paymentElementHost()?.nativeElement;
    if (!host) {
      return;
    }
    try {
      const { publishableKey } = await firstValueFrom(
        this.subscriptionsFacade.getBillingConfig(),
      );
      await this.stripePayment.init(publishableKey);
      this.stripePayment.mount(
        host,
        this.totalCents(),
        () => this.elementReady.set(true),
        () => this.elementFailed.set(true),
      );
    } catch {
      this.elementFailed.set(true);
    }
  }

  protected onCodeInput(value: string): void {
    this.code.set(value.toUpperCase());
    this.codeError.set(false);
  }

  protected onHolderNameInput(value: string): void {
    this.holderName.set(value);
  }

  protected applyCode(): void {
    const code = this.code().trim();
    if (!code || this.applying()) {
      return;
    }
    this.applying.set(true);
    this.subscriptionsFacade
      .validatePromotionCode(code)
      .pipe(
        finalize(() => this.applying.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (promotion) => {
          this.promotion.set(promotion);
          this.code.set('');
          this.codeError.set(false);
          this.stripePayment.updateAmount(this.totalCents());
        },
        error: () => this.codeError.set(true),
      });
  }

  protected removeCode(): void {
    this.promotion.set(null);
    this.stripePayment.updateAmount(this.totalCents());
  }

  protected async pay(): Promise<void> {
    if (this.paying() || !this.elementReady()) {
      return;
    }
    this.paying.set(true);
    this.paymentError.set(null);
    try {
      const submitted = await this.stripePayment.submit();
      if (submitted.errorMessage) {
        return;
      }
      const payment = await firstValueFrom(
        this.subscriptionsFacade.createSubscription(
          this.plan,
          this.promotion()?.code,
        ),
      );
      const confirmation = await this.stripePayment.confirm(
        payment.kind,
        payment.clientSecret,
        `${this.document.location.origin}/abonnement-confirme?offre=${PLAN_SLUGS[this.plan]}`,
        this.holderName().trim(),
        this.email(),
      );
      if (confirmation.errorMessage) {
        this.paymentError.set(confirmation.errorMessage);
        return;
      }
      this.router.navigate(['/abonnement-confirme'], {
        queryParams: { offre: PLAN_SLUGS[this.plan] },
      });
    } catch {
      this.paymentError.set(PAYMENT_FAILED_MESSAGE);
    } finally {
      this.paying.set(false);
    }
  }
}
