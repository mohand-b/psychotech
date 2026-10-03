import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EarnedBadgeDto } from '@psychotech/shared';
import { BadgeCelebrationFacade } from '../../badges/data-access/badge-celebration.facade';
import { EnergyFacade } from '../../energy/data-access/energy.facade';
import { BadgeCelebrationModal } from '../../shared/ui/badge-celebration-modal/badge-celebration-modal';

@Component({
  selector: 'app-badge-celebration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeCelebrationModal],
  template: `
    @if (facade.currentView(); as view) {
      <ui-badge-celebration-modal
        [view]="view"
        [position]="facade.position()"
        [total]="facade.total()"
        [isLast]="facade.isLast()"
        (advance)="completeCurrentBadge()"
        (closeAll)="dismissRemainingBadges()"
      />
    }
  `,
})
export class BadgeCelebration {
  protected readonly facade = inject(BadgeCelebrationFacade);
  private readonly energyFacade = inject(EnergyFacade);

  constructor() {
    this.facade.reconcileUnacknowledgedBadges();
  }

  protected completeCurrentBadge(): void {
    this.reloadEnergyOnCreditGain(this.facade.completeCurrentBadge());
  }

  protected dismissRemainingBadges(): void {
    this.reloadEnergyOnCreditGain(this.facade.dismissRemainingBadges());
  }

  private reloadEnergyOnCreditGain(
    acknowledged: readonly EarnedBadgeDto[],
  ): void {
    if (acknowledged.some((badge) => (badge.gain ?? 0) > 0)) {
      this.energyFacade.reloadEnergyBalance();
    }
  }
}
