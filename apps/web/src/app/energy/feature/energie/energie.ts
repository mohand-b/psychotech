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
import {
  BADGE_CATALOG,
  BADGE_TOTAL_REWARD,
  BadgeFamily,
  ENERGY_PACKS,
  EnergyPackDefinition,
  EnergyPackId,
  SESSION_ENERGY_COST,
  Sector,
  SessionMode,
  badgeAssetPath,
  badgeDisplayName,
  energyPackUnitPriceEur,
} from '@psychotech/shared';
import { StripeEmbeddedCheckout } from '@stripe/stripe-js';
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Check,
  CreditCard,
  Gift,
  ShieldCheck,
} from 'lucide-angular';
import { EMPTY, catchError, concatMap, of, take, takeWhile, timer } from 'rxjs';
import { BillingFacade } from '../../data-access/billing.facade';
import { EnergyFacade } from '../../data-access/energy.facade';
import { AxisIcon } from '../../../shared/ui/axis-icon/axis-icon';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { formatEuroAmount } from '../../../shared/util/format-euro';
import { inputValue } from '../../../shared/util/input-value';

type EnergieView = 'packs' | 'checkout' | 'confirmation';

type ConfirmationState = 'pending' | 'credited' | 'incomplete' | 'error';

interface PackCardView {
  id: EnergyPackId;
  title: string;
  energyAmount: number;
  description: string;
  unitPriceLabel: string;
  ctaLabel: string;
  featured: boolean;
}

interface RewardBadgeView {
  asset: string;
  name: string;
  gain: number;
}

const REWARD_SHOWCASE_COUNT = 3;

const FAMILY_SHOWCASE_ORDER: Record<BadgeFamily, number> = {
  [BadgeFamily.TRANSVERSE]: 0,
  [BadgeFamily.EXAM]: 1,
  [BadgeFamily.AXIS]: 2,
};

function topRewardBadges(): RewardBadgeView[] {
  return [...BADGE_CATALOG]
    .filter((definition) => definition.energyReward > 0)
    .sort(
      (a, b) =>
        b.energyReward - a.energyReward ||
        FAMILY_SHOWCASE_ORDER[a.family] - FAMILY_SHOWCASE_ORDER[b.family],
    )
    .slice(0, REWARD_SHOWCASE_COUNT)
    .map((definition) => ({
      asset: badgeAssetPath(definition, Sector.RAILWAY),
      name: badgeDisplayName(definition, Sector.RAILWAY),
      gain: definition.energyReward,
    }));
}

const PACK_DESCRIPTIONS: Record<EnergyPackId, string> = {
  [EnergyPackId.DISCOVERY]: 'Soit 3 examens blancs, ou 15 sessions ciblées',
  [EnergyPackId.PRE_EXAM]:
    "Soit 10 examens blancs, ou un mois d'entraînement quotidien",
  [EnergyPackId.FULL_PREP]:
    'Soit 24 examens blancs, de quoi couvrir toute une préparation',
};

const FEATURED_PACK = EnergyPackId.PRE_EXAM;

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
  protected readonly giftIcon = Gift;
  protected readonly checkIcon = Check;
  protected readonly readValue = inputValue;

  protected readonly targetedCost = SESSION_ENERGY_COST[SessionMode.TARGETED];
  protected readonly fullCost = SESSION_ENERGY_COST[SessionMode.FULL];

  protected readonly balance = computed(
    () => this.energyFacade.state()?.balance ?? 0,
  );

  protected readonly view = signal<EnergieView>('packs');
  protected readonly checkoutLoading = signal(false);
  protected readonly checkoutError = signal(false);
  protected readonly confirmation = signal<ConfirmationState>('pending');

  protected readonly packs: readonly PackCardView[] = ENERGY_PACKS.map(
    (pack) => this.toPackCard(pack),
  );

  protected readonly totalReward = BADGE_TOTAL_REWARD;

  protected readonly rewardBadges: readonly RewardBadgeView[] = topRewardBadges();

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
    this.cancelGiftCounter();
  }

  protected readonly giftCode = signal('');
  protected readonly giftStatus = signal<GiftStatus>('idle');
  protected readonly giftSending = signal(false);
  protected readonly giftGranted = signal(0);
  protected readonly giftCounter = signal(0);

  private readonly document = inject(DOCUMENT);
  private giftFrame: number | null = null;

  protected onGiftInput(event: Event): void {
    this.giftCode.set(inputValue(event));
    this.giftStatus.set('idle');
  }

  protected applyGiftCode(): void {
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

  protected resetGift(): void {
    this.cancelGiftCounter();
    this.giftCode.set('');
    this.giftGranted.set(0);
    this.giftCounter.set(0);
    this.giftStatus.set('idle');
  }

  private animateGiftCounter(granted: number): void {
    this.cancelGiftCounter();
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
    const step = (now: number) => {
      const elapsed = now - start - GIFT_COUNT_DELAY_MS;
      const value =
        elapsed <= 0
          ? 0
          : Math.min(granted, Math.floor(elapsed / GIFT_COUNT_STEP_MS) + 1);
      this.giftCounter.set(value);
      this.giftFrame =
        value >= granted ? null : view.requestAnimationFrame(step);
    };
    this.giftFrame = view.requestAnimationFrame(step);
  }

  private cancelGiftCounter(): void {
    if (this.giftFrame !== null) {
      this.document.defaultView?.cancelAnimationFrame(this.giftFrame);
      this.giftFrame = null;
    }
  }

  protected async selectPack(packId: EnergyPackId): Promise<void> {
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

  protected backToPacks(): void {
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
          this.billingFacade.checkoutStatus(sessionId).pipe(
            catchError(() => {
              this.confirmation.set('error');
              return EMPTY;
            }),
          ),
        ),
        takeWhile((status, index) => {
          if (status.credited) {
            this.confirmation.set('credited');
            this.energyFacade.load().subscribe({ error: () => undefined });
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

  private toPackCard(pack: EnergyPackDefinition): PackCardView {
    return {
      id: pack.id,
      title: pack.title,
      energyAmount: pack.energyAmount,
      description: PACK_DESCRIPTIONS[pack.id],
      unitPriceLabel: `${formatEuroAmount(energyPackUnitPriceEur(pack))} € par crédit`,
      ctaLabel: `Recharger · ${formatEuroAmount(pack.priceCents / 100)} €`,
      featured: pack.id === FEATURED_PACK,
    };
  }
}
