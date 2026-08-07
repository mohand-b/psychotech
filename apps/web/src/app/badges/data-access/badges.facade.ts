import { Injectable, inject } from '@angular/core';
import { BadgesApi } from './badges.api';

@Injectable({ providedIn: 'root' })
export class BadgesFacade {
  private readonly api = inject(BadgesApi);

  private tutorialNotified = false;

  notifyTutorialDiscovered(): void {
    if (this.tutorialNotified) {
      return;
    }
    this.tutorialNotified = true;
    this.api.tutorialDiscovered().subscribe({ error: () => undefined });
  }
}
