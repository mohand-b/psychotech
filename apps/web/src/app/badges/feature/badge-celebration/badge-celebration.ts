import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { Sector } from '@psychotech/shared';
import { filter } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { isQuietForCelebration } from '../../../core/badges/play-routes';
import { AxisIcon } from '../../../shared/ui/axis-icon/axis-icon';
import { Button } from '../../../shared/ui/button/button';
import { BadgeRevealView } from '../../../shared/ui/badge-unlock/badge-unlock';
import { badgeRevealViewFor } from '../../data-access/badge-display';
import { BadgesFacade } from '../../data-access/badges.facade';

export { isQuietForCelebration };

@Component({
  selector: 'app-badge-celebration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisIcon, Button],
  template: `
    @if (visible()) {
      @if (current(); as badge) {
        <div
          class="celebration"
          role="dialog"
          aria-modal="true"
          aria-label="Badge débloqué"
        >
          <div class="celebration__card">
            <span class="t-label">Badge débloqué</span>
            <img
              class="celebration__art"
              [src]="badge.assetPath"
              [alt]="badge.name"
            />
            <span class="celebration__name">{{ badge.name }}</span>
            @if (badge.gain) {
              <span class="celebration__gain t-mono"
                >+{{ badge.gain }}<ui-axis-icon axis="credit" [size]="13" />
                offerts</span
              >
            }
            <ui-button color="brand" (click)="acknowledgeCurrent()"
              >Continuer</ui-button
            >
          </div>
        </div>
      }
    }
  `,
  styles: `
    .celebration {
      position: fixed;
      inset: 0;
      z-index: 60;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: color-mix(in srgb, var(--ink) 45%, transparent);
    }
    .celebration__card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      width: 100%;
      max-width: 360px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-panel);
      box-shadow: var(--shadow-raised);
      padding: 32px 28px;
      text-align: center;
    }
    .celebration__art {
      width: 96px;
      height: 96px;
      object-fit: contain;
    }
    .celebration__name {
      font: 700 22px/1.2 var(--font-display);
      color: var(--ink);
    }
    .celebration__gain {
      font-size: 14px;
      font-weight: 600;
      color: var(--brand-hover);
    }
  `,
})
export class BadgeCelebration {
  private readonly badgesFacade = inject(BadgesFacade);
  private readonly authFacade = inject(AuthFacade);
  private readonly router = inject(Router);

  private readonly url = signal(this.router.url);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.url.set(event.urlAfterRedirects));
    this.badgesFacade.loadUnacknowledged();
  }

  protected readonly current = computed<BadgeRevealView | null>(() => {
    const pending = this.badgesFacade.pending()[0];
    if (!pending) {
      return null;
    }
    const sector =
      this.authFacade.currentUser()?.currentSector ?? Sector.RAILWAY;
    return badgeRevealViewFor(pending.badgeId, pending.gain ?? 0, sector);
  });

  protected readonly visible = computed(
    () => this.current() !== null && isQuietForCelebration(this.url()),
  );

  protected acknowledgeCurrent(): void {
    this.badgesFacade.acknowledgeCurrentCelebration();
  }
}
