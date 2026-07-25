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
import {
  ENERGY_CAPACITY,
  ENERGY_PACK_PRICE_EUR,
  PaymentMethodOverviewDto,
  SubscriptionTier,
} from '@psychotech/shared';
import { ArrowRight, Check, Clock, Info, RotateCcw } from 'lucide-angular';
import { catchError, of, switchMap, takeWhile, timer } from 'rxjs';
import { EnergyFacade } from '../../data-access/energy.facade';
import { SubscriptionsFacade } from '../../../subscriptions/data-access/subscriptions.facade';
import { BoltIcon } from '../../../shared/ui/bolt-icon/bolt-icon';
import { EnergyChip } from '../../../shared/ui/energy-chip/energy-chip';
import { Icon } from '../../../shared/ui/icon/icon';
import { buildPaymentMethodView } from '../../../shared/ui/payment-method-view';
import { formatEuroAmount } from '../../../shared/util/subscription-prices';

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 15;
const PENDING_PURCHASE_STORAGE_KEY = 'energy-recharge-pending';

type RechargePhase = 'buy' | 'pending' | 'done';

@Component({
  selector: 'app-recharge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BoltIcon, EnergyChip, Icon, RouterLink],
  templateUrl: './recharge.html',
  styleUrl: './recharge.css',
})
export class Recharge {
  private readonly energyFacade = inject(EnergyFacade);
  private readonly subscriptionsFacade = inject(SubscriptionsFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly arrowIcon = ArrowRight;
  protected readonly infoIcon = Info;
  protected readonly clockIcon = Clock;
  protected readonly refillIcon = RotateCcw;
  protected readonly checkIcon = Check;

  protected readonly tiers = SubscriptionTier;
  protected readonly capacity = ENERGY_CAPACITY;
  protected readonly priceLabel = `${formatEuroAmount(ENERGY_PACK_PRICE_EUR)} €`;
  protected readonly packUnit = 'Remise à 5 énergies, paiement unique';

  protected readonly energy = this.energyFacade.state;
  protected readonly phase = signal<RechargePhase>('buy');
  protected readonly payError = signal(false);
  protected readonly paidAmountLabel = signal<string | null>(null);
  protected readonly paymentOverview =
    signal<PaymentMethodOverviewDto | null>(null);

  constructor() {
    const statut = this.route.snapshot.queryParamMap.get('statut');
    if (statut === 'succes') {
      this.phase.set('done');
      this.readPendingPurchase();
      this.pollBalance();
    } else if (statut === 'annule') {
      sessionStorage.removeItem(PENDING_PURCHASE_STORAGE_KEY);
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { statut: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
    this.subscriptionsFacade
      .getPaymentMethodOverview()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (overview) => this.paymentOverview.set(overview),
        error: () => this.paymentOverview.set(null),
      });
  }

  protected readonly balance = computed(() => this.energy()?.balance ?? null);

  protected readonly isDone = computed(() => this.phase() === 'done');

  protected readonly isFull = computed(() => {
    const balance = this.balance();
    return !this.isDone() && balance !== null && balance >= ENERGY_CAPACITY;
  });

  protected readonly isBuy = computed(() => {
    const balance = this.balance();
    return !this.isDone() && balance !== null && balance < ENERGY_CAPACITY;
  });

  protected readonly packSub =
    'Votre solde revient à 5 immédiatement, sans attendre minuit.';

  protected readonly payLabel = computed(() =>
    this.phase() === 'pending' ? 'Paiement…' : `Payer ${this.priceLabel}`,
  );

  protected readonly methodView = computed(() => {
    const card = this.paymentOverview()?.card ?? null;
    return card ? buildPaymentMethodView(card) : null;
  });

  protected pay(): void {
    if (this.phase() !== 'buy' || !this.isBuy()) {
      return;
    }
    this.phase.set('pending');
    this.payError.set(false);
    this.subscriptionsFacade
      .createEnergyCheckout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ url }) => {
          sessionStorage.setItem(
            PENDING_PURCHASE_STORAGE_KEY,
            JSON.stringify({ amount: this.priceLabel }),
          );
          this.openCheckout(url);
        },
        error: () => {
          this.phase.set('buy');
          this.payError.set(true);
        },
      });
  }

  protected openCheckout(url: string): void {
    window.location.assign(url);
  }

  private readPendingPurchase(): void {
    const raw = sessionStorage.getItem(PENDING_PURCHASE_STORAGE_KEY);
    sessionStorage.removeItem(PENDING_PURCHASE_STORAGE_KEY);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as { amount?: string };
      this.paidAmountLabel.set(parsed.amount ?? null);
    } catch {
      this.paidAmountLabel.set(null);
    }
  }

  private pollBalance(): void {
    timer(0, POLL_INTERVAL_MS)
      .pipe(
        switchMap(() =>
          this.energyFacade.load().pipe(catchError(() => of(null))),
        ),
        takeWhile(
          (state, index) =>
            index < POLL_MAX_ATTEMPTS - 1 &&
            (state === null || state.balance < state.capacity),
          true,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
