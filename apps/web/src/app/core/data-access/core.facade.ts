import { DOCUMENT } from '@angular/common';
import {
  Injectable,
  Signal,
  computed,
  inject,
  isDevMode,
} from '@angular/core';
import { SubscriptionTier } from '@psychotech/shared';
import { EnergyFacade } from '../../energy/data-access/energy.facade';
import { CoreStore } from './core.store';

const DEV_TIER_STORAGE_KEY = 'psychotech.dev.tier';

interface DevTierWindow extends Window {
  psychotechSetTier?: (tier: string | null) => void;
}

@Injectable({ providedIn: 'root' })
export class CoreFacade {
  private readonly store = inject(CoreStore);
  private readonly energyFacade = inject(EnergyFacade);
  private readonly document = inject(DOCUMENT);

  readonly tier: Signal<SubscriptionTier> = computed(
    () =>
      this.store.tierOverride() ??
      this.energyFacade.state()?.tier ??
      SubscriptionTier.FREE,
  );

  constructor() {
    if (isDevMode()) {
      this.restoreDevTierOverride();
      this.exposeDevTierToggle();
    }
  }

  setTierOverride(tier: SubscriptionTier | null): void {
    this.store.setTierOverride(tier);
    const storage = this.document.defaultView?.localStorage;
    if (!storage) {
      return;
    }
    if (tier === null) {
      storage.removeItem(DEV_TIER_STORAGE_KEY);
    } else {
      storage.setItem(DEV_TIER_STORAGE_KEY, tier);
    }
  }

  private restoreDevTierOverride(): void {
    const stored = this.document.defaultView?.localStorage?.getItem(
      DEV_TIER_STORAGE_KEY,
    );
    if (stored && this.isTier(stored)) {
      this.store.setTierOverride(stored);
    }
  }

  private exposeDevTierToggle(): void {
    const devWindow = this.document.defaultView as DevTierWindow | null;
    if (!devWindow) {
      return;
    }
    devWindow.psychotechSetTier = (tier: string | null) => {
      if (tier === null) {
        this.setTierOverride(null);
        return;
      }
      if (this.isTier(tier)) {
        this.setTierOverride(tier);
      }
    };
  }

  private isTier(value: string): value is SubscriptionTier {
    return (Object.values(SubscriptionTier) as string[]).includes(value);
  }
}
