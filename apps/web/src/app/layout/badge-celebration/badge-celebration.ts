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
        (advance)="advance()"
        (closeAll)="closeAll()"
      />
    }
  `,
})
export class BadgeCelebration {
  protected readonly facade = inject(BadgeCelebrationFacade);
  private readonly energyFacade = inject(EnergyFacade);

  constructor() {
    this.facade.reconcileUnacknowledged();
  }

  protected advance(): void {
    this.reloadEnergyOnCreditGain(this.facade.completeCurrent());
  }

  protected closeAll(): void {
    this.reloadEnergyOnCreditGain(this.facade.dismissAll());
  }

  private reloadEnergyOnCreditGain(
    acknowledged: readonly EarnedBadgeDto[],
  ): void {
    if (acknowledged.some((badge) => (badge.gain ?? 0) > 0)) {
      this.energyFacade.reload();
    }
  }
}
