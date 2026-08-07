import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Sector } from '@psychotech/shared';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { BadgeCelebrationModal } from '../../../shared/ui/badge-celebration-modal/badge-celebration-modal';
import { BadgeCelebrationFacade } from '../../data-access/badge-celebration.facade';
import { badgeCelebrationViewFor } from '../../data-access/badge-display';

@Component({
  selector: 'app-badge-celebration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeCelebrationModal],
  template: `
    @if (currentView(); as view) {
      <ui-badge-celebration-modal
        [view]="view"
        [position]="facade.position()"
        [total]="facade.total()"
        [isLast]="facade.isLast()"
        (advance)="facade.completeCurrent()"
        (closeAll)="facade.dismissAll()"
      />
    }
  `,
})
export class BadgeCelebration {
  protected readonly facade = inject(BadgeCelebrationFacade);
  private readonly authFacade = inject(AuthFacade);

  constructor() {
    this.facade.reconcileUnacknowledged();
  }

  protected readonly currentView = computed(() => {
    const badge = this.facade.current();
    if (!badge) {
      return null;
    }
    const sector =
      this.authFacade.currentUser()?.currentSector ?? Sector.RAILWAY;
    return badgeCelebrationViewFor(badge, sector);
  });
}
