import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BADGE_TOTAL_REWARD, EnergyPackId } from '@psychotech/shared';
import { StripeEmbeddedCheckout } from '@stripe/stripe-js';
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Check,
  CreditCard,
  ShieldCheck,
} from 'lucide-angular';
import { EMPTY, catchError, concatMap, of, take, takeWhile, timer } from 'rxjs';
import { sumEarnedBadgeRewards } from '../../../badges/data-access/badge-display';
import { BadgesFacade } from '../../../badges/data-access/badges.facade';
import { BillingFacade } from '../../data-access/billing.facade';
import { EnergyFacade } from '../../data-access/energy.facade';
import { AxisIcon } from '../../../shared/ui/axis-icon/axis-icon';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import {
  ENERGY_PACK_OFFERS,
  SESSION_CREDIT_COSTS,
} from '../../../shared/util/energy-pack-offer';
import { readInputValue } from '../../../shared/util/input-value';

type EnergieView = 'packs' | 'checkout' | 'confirmation';

type ConfirmationState = 'pending' | 'credited' | 'incomplete' | 'error';

function buildBalanceLabel(balance: number): string {
  if (balance === 0) {
    return 'Aucun crédit disponible';
  }
  return balance === 1 ? 'crédit disponible' : 'crédits disponibles';
}

const STATUS_POLL_INTERVAL_MS = 1500;

const STATUS_POLL_ATTEMPTS = 8;

const GIFT_COUNT_DELAY_MS = 480;

const GIFT_COUNT_STEP_MS = 55;

type GiftStatus = 'idle' | 'error' | 'ok';

@Component({
  selector: 'app-energie',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisIcon, Button, Icon, RouterLink],
  templateUrl: './energie.html',
  styleUrl: './energie.css',
})
export class Energie implements OnDestroy {
  private readonly energyFacade = inject(EnergyFacade);
  private readonly billingFacade = inject(BillingFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private embeddedCheckout: StripeEmbeddedCheckout | null = null;

  private readonly checkoutHost =
    viewChild.required<ElementRef<HTMLElement>>('checkoutHost');

  protected readonly shieldIcon = ShieldCheck;
  protected readonly banIcon = Ban;
  protected readonly cardIcon = CreditCard;
  protected readonly arrowRightIcon = ArrowRight;
  protected readonly arrowLeftIcon = ArrowLeft;
  protected readonly checkIcon = Check;
  protected readonly readValue = readInputValue;

  protected readonly sessionCosts = SESSION_CREDIT_COSTS;
  protected readonly packs = ENERGY_PACK_OFFERS;
  protected readonly totalReward = BADGE_TOTAL_REWARD;

  private readonly badgeStatuses = inject(BadgesFacade).fetchStatuses();

  protected readonly balance = computed(
    () => this.energyFacade.state()?.balance ?? 0,
  );

  protected readonly balanceLabel = computed(() =>
    buildBalanceLabel(this.balance()),
  );

  protected readonly earnedReward = computed(() =>
    sumEarnedBadgeRewards(this.badgeStatuses() ?? []),
  );

  protected readonly earnedRewardPercent = computed(() =>
    Math.round((this.earnedReward() / BADGE_TOTAL_REWARD) * 100),
  );

  protected readonly view = signal<EnergieView>('packs');
  protected readonly checkoutLoading = signal(false);
  protected readonly checkoutError = signal(false);
  protected readonly confirmation = signal<ConfirmationState>('pending');

  constructor() {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    if (sessionId) {
      this.view.set('confirmation');
      this.confirmation.set('pending');
      this.router.navigate([], {
        queryParams: { session_id: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      this.pollCheckoutStatus(sessionId);
    }
  }

  ngOnDestroy(): void {
    this.embeddedCheckout?.destroy();
    this.cancelGiftCounterAnimation();
  }

  protected readonly giftCode = signal('');
  protected readonly giftStatus = signal<GiftStatus>('idle');
  protected readonly giftSending = signal(false);
  protected readonly giftGranted = signal(0);
  protected readonly giftCounter = signal(0);

  private readonly document = inject(DOCUMENT);
  private giftFrame: number | null = null;

  protected updateGiftCode(event: Event): void {
    this.giftCode.set(readInputValue(event));
    this.giftStatus.set('idle');
  }

  protected redeemGiftCode(): void {
    const code = this.giftCode().trim();
    if (code.length === 0 || this.giftSending()) {
      return;
    }
    this.giftSending.set(true);
    this.energyFacade
      .redeemGiftCode(code)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.giftSending.set(false);
          this.giftGranted.set(result.granted);
          this.giftStatus.set('ok');
          this.animateGiftCounter(result.granted);
        },
        error: () => {
          this.giftSending.set(false);
          this.giftStatus.set('error');
        },
      });
  }

  protected resetGiftCodeForm(): void {
    this.cancelGiftCounterAnimation();
    this.giftCode.set('');
    this.giftGranted.set(0);
    this.giftCounter.set(0);
    this.giftStatus.set('idle');
  }

  private animateGiftCounter(granted: number): void {
    this.cancelGiftCounterAnimation();
    const view = this.document.defaultView;
    const reduced =
      !view ||
      typeof view.matchMedia !== 'function' ||
      view.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !view) {
      this.giftCounter.set(granted);
      return;
    }
    this.giftCounter.set(0);
    const start = view.performance.now();
    const renderGiftCounterFrame = (now: number) => {
      const elapsed = now - start - GIFT_COUNT_DELAY_MS;
      const value =
        elapsed <= 0
          ? 0
          : Math.min(granted, Math.floor(elapsed / GIFT_COUNT_STEP_MS) + 1);
      this.giftCounter.set(value);
      this.giftFrame =
        value >= granted
          ? null
          : view.requestAnimationFrame(renderGiftCounterFrame);
    };
    this.giftFrame = view.requestAnimationFrame(renderGiftCounterFrame);
  }

  private cancelGiftCounterAnimation(): void {
    if (this.giftFrame !== null) {
      this.document.defaultView?.cancelAnimationFrame(this.giftFrame);
      this.giftFrame = null;
    }
  }

  protected async openPackCheckout(packId: EnergyPackId): Promise<void> {
    if (this.checkoutLoading()) {
      return;
    }
    this.checkoutError.set(false);
    this.checkoutLoading.set(true);
    this.view.set('checkout');
    try {
      this.embeddedCheckout?.destroy();
      this.embeddedCheckout = null;
      const checkout = await this.billingFacade.createPackCheckout(packId);
      this.embeddedCheckout = checkout;
      checkout.mount(this.checkoutHost().nativeElement);
    } catch {
      this.checkoutError.set(true);
    } finally {
      this.checkoutLoading.set(false);
    }
  }

  protected returnToPacks(): void {
    this.embeddedCheckout?.destroy();
    this.embeddedCheckout = null;
    this.checkoutError.set(false);
    this.view.set('packs');
  }

  private pollCheckoutStatus(sessionId: string): void {
    timer(0, STATUS_POLL_INTERVAL_MS)
      .pipe(
        take(STATUS_POLL_ATTEMPTS),
        concatMap(() =>
          this.billingFacade.fetchCheckoutStatus(sessionId).pipe(
            catchError(() => {
              this.confirmation.set('error');
              return EMPTY;
            }),
          ),
        ),
        takeWhile((status, index) => {
          if (status.credited) {
            this.confirmation.set('credited');
            this.energyFacade.reloadEnergyBalance();
            return false;
          }
          if (status.status !== 'complete') {
            this.confirmation.set('incomplete');
            return false;
          }
          if (index === STATUS_POLL_ATTEMPTS - 1) {
            this.confirmation.set('error');
            return false;
          }
          return true;
        }),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
