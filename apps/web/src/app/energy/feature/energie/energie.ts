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
  ENERGY_PACKS,
  EnergyPackDefinition,
  EnergyPackId,
  EXAM_FAVORABLE_REWARD,
  FIRST_STEPS_REWARD,
  SESSION_ENERGY_COST,
  SessionMode,
  energyPackUnitPriceEur,
} from '@psychotech/shared';
import { StripeEmbeddedCheckout } from '@stripe/stripe-js';
import { ArrowLeft, ArrowRight, Ban, CreditCard, ShieldCheck } from 'lucide-angular';
import { EMPTY, catchError, concatMap, of, take, takeWhile, timer } from 'rxjs';
import { BillingFacade } from '../../data-access/billing.facade';
import { EnergyFacade } from '../../data-access/energy.facade';
import { AxisIcon } from '../../../shared/ui/axis-icon/axis-icon';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { formatEuroAmount } from '../../../shared/util/format-euro';

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

  protected readonly rewardBadges: readonly RewardBadgeView[] = [
    {
      asset: 'badges/badge-premiers-pas.svg',
      name: 'Premiers pas',
      gain: FIRST_STEPS_REWARD,
    },
    {
      asset: 'badges/badge-examen-argent.svg',
      name: 'Apte',
      gain: EXAM_FAVORABLE_REWARD,
    },
  ];

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
