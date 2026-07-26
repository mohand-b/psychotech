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
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentMethodOverviewDto, SubscriptionTier } from '@psychotech/shared';
import { CircleAlert, CreditCard, ShieldCheck } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { formatDayMonthYear } from '../../../shared/util/format-day-month-year';
import { formatEuroAmount } from '../../../shared/util/subscription-prices';
import { buildPaymentMethodView } from '../../../shared/ui/payment-method-view';
import { StripePaymentService } from '../../data-access/stripe-payment.service';
import { SubscriptionsFacade } from '../../data-access/subscriptions.facade';

const CARD_UPDATE_FAILED_MESSAGE =
  "L'enregistrement du moyen de paiement n'a pas abouti. Vérifiez vos informations et réessayez.";

@Component({
  selector: 'app-payment-method',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon],
  providers: [StripePaymentService],
  templateUrl: './payment-method.html',
  styleUrl: './payment-method.css',
})
export class PaymentMethod {
  private readonly coreFacade = inject(CoreFacade);
  private readonly subscriptionsFacade = inject(SubscriptionsFacade);
  private readonly stripePayment = inject(StripePaymentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly returnPath = this.sanitizedReturnPath();

  protected readonly cardIcon = CreditCard;
  protected readonly shieldIcon = ShieldCheck;
  protected readonly errorIcon = CircleAlert;

  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly elementReady = signal(false);
  protected readonly elementFailed = signal(false);
  protected readonly overview = signal<PaymentMethodOverviewDto | null>(null);

  private readonly paymentElementHost =
    viewChild<ElementRef<HTMLElement>>('paymentElement');

  constructor() {
    if (this.coreFacade.tier() === SubscriptionTier.FREE) {
      this.router.navigate(['/abonnements']);
      return;
    }
    this.subscriptionsFacade
      .getPaymentMethodOverview()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (overview) => this.overview.set(overview),
        error: () => this.overview.set(null),
      });
    afterNextRender(() => void this.setupPaymentElement());
  }

  protected readonly currentCard = computed(
    () => this.overview()?.card ?? null,
  );
  protected readonly methodView = computed(() => {
    const card = this.currentCard();
    return card ? buildPaymentMethodView(card) : null;
  });
  protected readonly nextInvoiceAmountLabel = computed(() => {
    const amount = this.overview()?.nextInvoiceAmount;
    return amount === null || amount === undefined
      ? null
      : formatEuroAmount(amount / 100);
  });
  protected readonly nextInvoiceDateLabel = computed(() => {
    const iso = this.overview()?.nextInvoiceDate;
    return iso ? formatDayMonthYear(iso) : null;
  });

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
        0,
        () => this.elementReady.set(true),
        () => this.elementFailed.set(true),
      );
    } catch {
      this.elementFailed.set(true);
    }
  }

  protected async save(): Promise<void> {
    if (this.saving() || !this.elementReady()) {
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const submitted = await this.stripePayment.validateForm();
      if (submitted.errorMessage) {
        return;
      }
      const setup = await firstValueFrom(
        this.subscriptionsFacade.createPaymentMethodSetup(),
      );
      const confirmation = await this.stripePayment.confirm(
        setup.kind,
        setup.clientSecret,
        `${this.document.location.origin}${this.returnPath}`,
        '',
        '',
      );
      if (confirmation.errorMessage) {
        this.saveError.set(confirmation.errorMessage);
        return;
      }
      this.router.navigateByUrl(this.returnPath);
    } catch {
      this.saveError.set(CARD_UPDATE_FAILED_MESSAGE);
    } finally {
      this.saving.set(false);
    }
  }

  private sanitizedReturnPath(): string {
    const retour = this.route.snapshot.queryParamMap.get('retour');
    return retour && retour.startsWith('/') && !retour.startsWith('//')
      ? retour
      : '/abonnements';
  }
}
