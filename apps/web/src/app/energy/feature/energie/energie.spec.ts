import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import {
  BADGE_BY_ID,
  BADGE_TOTAL_REWARD,
  BadgeId,
  BadgeStatusDto,
  EnergyPackId,
  EnergyStateDto,
  GooglePlayPurchaseStatus,
} from '@psychotech/shared';
import { of } from 'rxjs';
import { BadgesFacade } from '../../../badges/data-access/badges.facade';
import { BillingFacade } from '../../data-access/billing.facade';
import { EnergyFacade } from '../../data-access/energy.facade';
import { Energie } from './energie';
import {
  endPlayAppSession,
  startPlayAppSession,
} from '../../../core/play-app/play-app.testing';

function energyState(balance: number): EnergyStateDto {
  return { balance, canStartFull: balance >= 5, canStartAxis: balance >= 1 };
}

const EARNED_BADGES = [BadgeId.FIRST_STEPS, BadgeId.SECTOR_MASTERY];

function earnedStatus(badgeId: BadgeId): BadgeStatusDto {
  return {
    badgeId,
    earnedAt: '2026-08-07T10:00:00.000Z',
    acknowledgedAt: '2026-08-07T10:00:00.000Z',
    conditions: [],
    rarityPercent: null,
  };
}

const GOOGLE_PLAY_PRICES: ReadonlyMap<EnergyPackId, string> = new Map([
  [EnergyPackId.DISCOVERY, '3,49 €'],
  [EnergyPackId.PRE_EXAM, '8,99 €'],
  [EnergyPackId.FULL_PREP, '16,99 €'],
]);

let googlePlayPrices: ReadonlyMap<EnergyPackId, string> | null =
  GOOGLE_PLAY_PRICES;
let googlePlayPurchase: () => Promise<GooglePlayPurchaseStatus>;
const purchasePackWithGooglePlay = vi.fn(() => googlePlayPurchase());
const reloadEnergyBalance = vi.fn();
let runningInGoogleChrome = true;

const EARNED_REWARD = EARNED_BADGES.reduce(
  (sum, badgeId) => sum + (BADGE_BY_ID.get(badgeId)?.energyReward ?? 0),
  0,
);

async function setup(sessionId: string | null = null) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [Energie],
    providers: [
      provideRouter([]),
      {
        provide: EnergyFacade,
        useValue: {
          state: () => energyState(12),
          loadEnergyBalance: () => of(energyState(12)),
          reloadEnergyBalance,
        },
      },
      {
        provide: BadgesFacade,
        useValue: {
          fetchStatuses: () =>
            signal(EARNED_BADGES.map(earnedStatus)).asReadonly(),
        },
      },
      {
        provide: BillingFacade,
        useValue: {
          createPackCheckout: () => Promise.reject(new Error('not mocked')),
          fetchCheckoutStatus: () =>
            of({ status: 'complete' as const, credited: true }),
          fetchGooglePlayPackPrices: () => Promise.resolve(googlePlayPrices),
          recoverGooglePlayPurchases: () => Promise.resolve(false),
          isRunningInGoogleChrome: () => runningInGoogleChrome,
          purchasePackWithGooglePlay,
        },
      },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({}),
            queryParamMap: convertToParamMap(
              sessionId ? { session_id: sessionId } : {},
            ),
          },
        },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(Energie);
  fixture.detectChanges();
  return fixture;
}

describe('Energie', () => {
  it('shows the current balance without any cap', async () => {
    const fixture = await setup();
    const value: HTMLElement = fixture.nativeElement.querySelector(
      '.energie__solde-value',
    );
    expect(value.textContent?.trim()).toBe('12');
    expect(fixture.nativeElement.textContent).toContain('crédits disponibles');
    expect(fixture.nativeElement.textContent).toContain(
      'un entraînement ciblé',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'un examen blanc complet',
    );
  });

  it('renders the three one-time packs with the middle one featured', async () => {
    const fixture = await setup();
    const cards = fixture.nativeElement.querySelectorAll('.energie__pack');
    expect(cards).toHaveLength(3);
    const featured = fixture.nativeElement.querySelectorAll(
      '.energie__pack--featured',
    );
    expect(featured).toHaveLength(1);
    expect(featured[0].textContent).toContain("Avant l'examen");
    expect(featured[0].textContent).toContain('Le plus choisi');
    expect(cards[0].textContent).toContain('Pour découvrir le format');
    expect(cards[0].textContent).toContain("Jusqu'à 3 examens blancs");
    expect(cards[0].textContent).toContain('ou 15 entraînements ciblés');
    const prices = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('.energie__pack-cta-price'),
    ).map((price) => price.textContent?.trim());
    expect(prices).toEqual(['2,90\u00A0€', '7,90\u00A0€', '14,90\u00A0€']);
  });

  it('shows the reassurance lines of the energy-only model', async () => {
    const fixture = await setup();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain("Vos crédits n'expirent jamais");
    expect(text).toContain('Aucun abonnement, aucune reconduction');
  });

  it('links the badges band to the badges page with the credits already earned', async () => {
    const fixture = await setup();
    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector(
      '.energie__badges-link',
    );
    expect(link?.getAttribute('href')).toBe('/badges');
    const text = fixture.nativeElement.textContent;
    expect(text).toContain(`+${BADGE_TOTAL_REWARD}`);
    expect(text).toContain(`/ ${BADGE_TOTAL_REWARD} déjà gagnés`);
    const earned: HTMLElement = fixture.nativeElement.querySelector(
      '.energie__badges-earned-value',
    );
    expect(earned.textContent?.trim()).toBe(`${EARNED_REWARD}`);
  });

  it('enters the confirmation view when returning from a checkout', async () => {
    const fixture = await setup('cs_test_1');
    expect(
      fixture.nativeElement.querySelector('.energie__confirmation'),
    ).not.toBeNull();
  });
});

describe('Energie - app Play', () => {
  beforeEach(() => {
    startPlayAppSession();
    googlePlayPrices = GOOGLE_PLAY_PRICES;
    googlePlayPurchase = () => Promise.resolve('credited');
    runningInGoogleChrome = true;
    purchasePackWithGooglePlay.mockClear();
    reloadEnergyBalance.mockClear();
  });
  afterEach(endPlayAppSession);

  async function setupWithGooglePlay() {
    const fixture = await setup();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('sells the three packs at their Google Play prices', async () => {
    const fixture = await setupWithGooglePlay();
    const text = fixture.nativeElement.textContent ?? '';

    expect(
      fixture.nativeElement.querySelectorAll('.energie__pack'),
    ).toHaveLength(3);
    expect(text).toContain('3,49 €');
    expect(text).toContain('16,99 €');
    expect(text).not.toContain('psychotechtraining.com');
  });

  it('pays a pack through Google Play and confirms the new credits', async () => {
    const fixture = await setupWithGooglePlay();

    fixture.debugElement
      .queryAll(By.css('.energie__pack-cta'))[0]
      .triggerEventHandler('click');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(purchasePackWithGooglePlay).toHaveBeenCalledWith(
      EnergyPackId.DISCOVERY,
    );
    expect(reloadEnergyBalance).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Crédits ajoutés');
  });

  it('waits for Google Play when the payment is still pending', async () => {
    googlePlayPurchase = () => Promise.resolve('pending');
    const fixture = await setupWithGooglePlay();

    fixture.debugElement
      .queryAll(By.css('.energie__pack-cta'))[0]
      .triggerEventHandler('click');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Paiement en attente');
    expect(reloadEnergyBalance).not.toHaveBeenCalled();
  });

  it('stays on the packs when the Google Play payment is canceled', async () => {
    googlePlayPurchase = () =>
      Promise.reject(new DOMException('canceled', 'AbortError'));
    const fixture = await setupWithGooglePlay();

    fixture.debugElement
      .queryAll(By.css('.energie__pack-cta'))[0]
      .triggerEventHandler('click');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelectorAll('.energie__pack'),
    ).toHaveLength(3);
    expect(fixture.nativeElement.textContent).not.toContain(
      'Confirmation en attente',
    );
  });

  it('explains that Chrome is needed when the app runs in another browser', async () => {
    googlePlayPrices = null;
    runningInGoogleChrome = false;
    const fixture = await setupWithGooglePlay();
    const text = fixture.nativeElement.textContent ?? '';

    expect(
      fixture.nativeElement.querySelectorAll('.energie__pack'),
    ).toHaveLength(0);
    expect(text).toContain('nécessite Google Chrome');
    expect(text).toContain('Un code cadeau');
  });

  it('says purchases are unavailable for now without blaming Chrome when the app runs in Chrome', async () => {
    googlePlayPrices = null;
    const fixture = await setupWithGooglePlay();
    const text = fixture.nativeElement.textContent ?? '';

    expect(
      fixture.nativeElement.querySelectorAll('.energie__pack'),
    ).toHaveLength(0);
    expect(text).toContain(
      "L'achat de crédits n'est pas disponible dans l'application pour le moment.",
    );
    expect(text).not.toContain('Google Chrome');
  });
});
