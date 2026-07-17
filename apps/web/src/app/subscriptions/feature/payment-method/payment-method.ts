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
import { Router } from '@angular/router';
import { PaymentMethodOverviewDto, SubscriptionTier } from '@psychotech/shared';
import { CircleAlert, CreditCard, ShieldCheck } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { formatEuroAmount } from '../../../shared/util/subscription-prices';
import { StripePaymentService } from '../../data-access/stripe-payment.service';
import { SubscriptionsFacade } from '../../data-access/subscriptions.facade';

const CARD_UPDATE_FAILED_MESSAGE =
  "L'enregistrement de la carte n'a pas abouti. Vérifiez vos informations et réessayez.";

function formatDayMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

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
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

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
  protected readonly cardBrandLabel = computed(() =>
    (this.currentCard()?.brand ?? '').toUpperCase(),
  );
  protected readonly cardExpiryLabel = computed(() => {
    const card = this.currentCard();
    return card
      ? `${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}`
      : '';
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
      const submitted = await this.stripePayment.submit();
      if (submitted.errorMessage) {
        return;
      }
      const setup = await firstValueFrom(
        this.subscriptionsFacade.createPaymentMethodSetup(),
      );
      const confirmation = await this.stripePayment.confirm(
        setup.kind,
        setup.clientSecret,
        `${this.document.location.origin}/abonnements?carte=maj`,
        '',
        '',
      );
      if (confirmation.errorMessage) {
        this.saveError.set(confirmation.errorMessage);
        return;
      }
      this.router.navigate(['/abonnements'], {
        queryParams: { carte: 'maj' },
      });
    } catch {
      this.saveError.set(CARD_UPDATE_FAILED_MESSAGE);
    } finally {
      this.saving.set(false);
    }
  }
}
