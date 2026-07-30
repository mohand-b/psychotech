import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  ENERGY_CAPACITY,
  ENERGY_NO_PAYMENT_METHOD_ERROR_CODE,
  ENERGY_PACK_PRICE_EUR,
  ENERGY_PAYMENT_DECLINED_ERROR_CODE,
  PaymentMethodOverviewDto,
  SubscriptionTier,
} from '@psychotech/shared';
import { ArrowRight, Check, Clock, Info, RotateCcw } from 'lucide-angular';
import { catchError, of, switchMap, takeWhile, timer } from 'rxjs';
import { EnergyFacade } from '../../data-access/energy.facade';
import { SubscriptionsFacade } from '../../../subscriptions/data-access/subscriptions.facade';
import { BoltIcon } from '../../../shared/ui/bolt-icon/bolt-icon';
import { Button } from '../../../shared/ui/button/button';
import { EnergyChip } from '../../../shared/ui/energy-chip/energy-chip';
import { Icon } from '../../../shared/ui/icon/icon';
import { buildPaymentMethodView } from '../../../shared/ui/payment-method-view';
import { formatEuroAmount } from '../../../shared/util/subscription-prices';

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 15;

type RechargePhase = 'buy' | 'pending' | 'done';

const PAYMENT_ERROR_MESSAGES: Record<string, string> = {
  [ENERGY_NO_PAYMENT_METHOD_ERROR_CODE]:
    'Ajoutez d’abord une carte pour recharger votre énergie.',
  [ENERGY_PAYMENT_DECLINED_ERROR_CODE]:
    'Le paiement a été refusé par votre banque. Vérifiez votre carte.',
};

const GENERIC_PAYMENT_ERROR =
  "Le paiement n'a pas pu aboutir. Réessayez dans un instant.";

const CONFIRMATION_PENDING_MESSAGE =
  'Le paiement est accepté mais la confirmation tarde. Votre solde sera crédité automatiquement.';

@Component({
  selector: 'app-recharge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BoltIcon, Button, EnergyChip, Icon, RouterLink],
  templateUrl: './recharge.html',
  styleUrl: './recharge.css',
})
export class Recharge {
  private readonly energyFacade = inject(EnergyFacade);
  private readonly subscriptionsFacade = inject(SubscriptionsFacade);
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
  protected readonly packSub =
    'Votre solde revient à 5 immédiatement, sans attendre minuit.';

  protected readonly energy = this.energyFacade.state;
  protected readonly phase = signal<RechargePhase>('buy');
  protected readonly payError = signal<string | null>(null);
  protected readonly paymentOverview = signal<PaymentMethodOverviewDto | null>(
    null,
  );

  constructor() {
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
    this.payError.set(null);
    this.subscriptionsFacade
      .createEnergyRefill()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.pollUntilCredited(),
        error: (error: unknown) => {
          this.phase.set('buy');
          this.payError.set(this.paymentErrorMessage(error));
        },
      });
  }

  private pollUntilCredited(): void {
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
      .subscribe({
        complete: () => {
          const state = this.energy();
          if (state && state.balance >= state.capacity) {
            this.phase.set('done');
            return;
          }
          this.phase.set('buy');
          this.payError.set(CONFIRMATION_PENDING_MESSAGE);
        },
      });
  }

  private paymentErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = (error.error as { message?: string } | null)?.message;
      if (message && PAYMENT_ERROR_MESSAGES[message]) {
        return PAYMENT_ERROR_MESSAGES[message];
      }
    }
    return GENERIC_PAYMENT_ERROR;
  }
}
