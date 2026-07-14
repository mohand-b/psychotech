import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { SubscriptionTier } from '@psychotech/shared';
import { ArrowRight, Check, Minus } from 'lucide-angular';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { SubscriptionsFacade } from '../../data-access/subscriptions.facade';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';

interface CompareCell {
  kind: 'check' | 'dash' | 'mono';
  value?: string;
}

interface CompareRow {
  label: string;
  mobileLabel: string;
  desktop: [CompareCell, CompareCell, CompareCell];
  mobile: [CompareCell, CompareCell, CompareCell];
}

const CHECK: CompareCell = { kind: 'check' };
const DASH: CompareCell = { kind: 'dash' };
const mono = (value: string): CompareCell => ({ kind: 'mono', value });

@Component({
  selector: 'app-offers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon],
  templateUrl: './offers.html',
  styleUrl: './offers.css',
})
export class Offers {
  private readonly coreFacade = inject(CoreFacade);
  private readonly subscriptionsFacade = inject(SubscriptionsFacade);
  private readonly router = inject(Router);

  protected readonly choosing = signal<SubscriptionTier | null>(null);

  protected readonly checkIcon = Check;
  protected readonly dashIcon = Minus;
  protected readonly arrowIcon = ArrowRight;

  protected readonly tiers = SubscriptionTier;
  protected readonly tier = this.coreFacade.tier;

  protected readonly isFreeCurrent = computed(
    () => this.tier() === SubscriptionTier.FREE,
  );
  protected readonly isEssentialCurrent = computed(
    () => this.tier() === SubscriptionTier.ESSENTIAL,
  );
  protected readonly isUnlimitedCurrent = computed(
    () => this.tier() === SubscriptionTier.UNLIMITED,
  );

  protected readonly unlimitedBadge = computed(() =>
    this.isUnlimitedCurrent()
      ? 'Votre formule actuelle'
      : 'Recommandé pour la préparation intensive',
  );

  protected readonly compareRows: CompareRow[] = [
    {
      label: 'Mode découverte des axes',
      mobileLabel: 'Mode découverte',
      desktop: [CHECK, CHECK, CHECK],
      mobile: [CHECK, CHECK, CHECK],
    },
    {
      label: 'Énergie par jour',
      mobileLabel: 'Énergie / jour',
      desktop: [DASH, mono('5/jour'), mono('Illimité')],
      mobile: [DASH, mono('5'), mono('∞')],
    },
    {
      label: 'Simulation complète',
      mobileLabel: 'Coût simulation',
      desktop: [DASH, mono('5 énergies'), mono('Illimité')],
      mobile: [DASH, mono('5'), mono('∞')],
    },
    {
      label: 'Axes individuels',
      mobileLabel: "Coût d'un axe",
      desktop: [DASH, mono('1 énergie'), mono('Illimité')],
      mobile: [DASH, mono('1'), mono('∞')],
    },
    {
      label: 'Exercices renouvelés à chaque session',
      mobileLabel: 'Exercices renouvelés',
      desktop: [DASH, CHECK, CHECK],
      mobile: [DASH, CHECK, CHECK],
    },
    {
      label: 'Résultats détaillés & recommandations',
      mobileLabel: 'Résultats détaillés',
      desktop: [DASH, CHECK, CHECK],
      mobile: [DASH, CHECK, CHECK],
    },
    {
      label: 'Suivi de progression',
      mobileLabel: 'Suivi de progression',
      desktop: [DASH, CHECK, CHECK],
      mobile: [DASH, CHECK, CHECK],
    },
  ];

  protected choosePlan(tier: SubscriptionTier): void {
    if (this.choosing() !== null) {
      return;
    }
    this.choosing.set(tier);
    this.subscriptionsFacade.choosePlan(tier).subscribe({
      next: () => this.router.navigate(['/entrainements']),
      error: () => this.choosing.set(null),
    });
  }
}
