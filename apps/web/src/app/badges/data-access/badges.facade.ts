import { Injectable, inject } from '@angular/core';
import { GuideId } from '@psychotech/shared';
import { switchMap } from 'rxjs';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { BadgesApi } from './badges.api';

@Injectable({ providedIn: 'root' })
export class BadgesFacade {
  private readonly api = inject(BadgesApi);
  private readonly authFacade = inject(AuthFacade);

  private tutorialNotified = false;

  notifyTutorialDiscovered(): void {
    if (this.tutorialNotified) {
      return;
    }
    this.tutorialNotified = true;
    this.api.tutorialDiscovered().subscribe({ error: () => undefined });
  }

  markGuideRead(guide: GuideId): void {
    this.api
      .markGuideRead(guide)
      .pipe(switchMap(() => this.authFacade.loadCurrentUser()))
      .subscribe({ error: () => undefined });
  }
}
