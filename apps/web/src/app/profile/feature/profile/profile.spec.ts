import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import {
  BillingInvoiceDto,
  BillingOverviewDto,
  BillingPeriod,
  EnergyStateDto,
  InvoiceStatus,
  PaymentWalletType,
  ProgressionDto,
  Sector,
  SectorSummaryDto,
  SubscriptionStatus,
  SubscriptionTier,
  UserProfileDto,
} from '@psychotech/shared';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { CatalogFacade } from '../../../catalog/data-access/catalog.facade';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { ProgressionFacade } from '../../../progression/data-access/progression.facade';
import { SubscriptionsFacade } from '../../../subscriptions/data-access/subscriptions.facade';
import { Profile } from './profile';

function buildUser(overrides: Partial<UserProfileDto> = {}): UserProfileDto {
  return {
    id: 'user-1',
    email: 'mohand@example.com',
    firstName: 'Mohand',
    lastName: 'Boudjema',
    locale: 'fr-FR',
    timezone: 'Europe/Paris',
    currentSector: Sector.RAILWAY,
    tier: SubscriptionTier.UNLIMITED,
    subscription: {
      tier: SubscriptionTier.UNLIMITED,
      status: SubscriptionStatus.ACTIVE,
      billingPeriod: BillingPeriod.MONTHLY,
      currentPeriodEnd: '2026-08-05T00:00:00.000Z',
      cancelAtPeriodEnd: false,
      canceledAt: null,
      pendingTier: null,
    },
    createdAt: '2026-04-14T00:00:00.000Z',
    ...overrides,
  };
}

function buildEnergy(): EnergyStateDto {
  return {
    balance: 5,
    capacity: 5,
    tier: SubscriptionTier.UNLIMITED,
    resetsAt: '2026-07-26T00:00:00.000Z',
    canStartFull: true,
    canStartAxis: true,
  };
}

function buildBillingOverview(
  overrides: Partial<BillingOverviewDto> = {},
): BillingOverviewDto {
  return {
    tier: SubscriptionTier.UNLIMITED,
    status: SubscriptionStatus.ACTIVE,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    currentPeriodEnd: '2026-08-05T00:00:00.000Z',
    pendingTier: null,
    monthlyAmount: 1499,
    paymentMethod: {
      brand: 'mastercard',
      last4: '1234',
      expMonth: 8,
      expYear: 2027,
      wallet: PaymentWalletType.GOOGLE_PAY,
    },
    nextInvoiceDate: '2026-08-05T00:00:00.000Z',
    ...overrides,
  };
}

function buildProgression(): ProgressionDto {
  return {
    stats: {
      currentStreak: 3,
      longestStreak: 5,
      completedSessions: 23,
      fullSessionsCount: 4,
      targetedSessionsCount: 19,
      firstSessionAt: '2026-04-15T10:00:00.000Z',
      firstFullSessionAt: '2026-04-15T10:00:00.000Z',
      firstGlobalScore: 60,
      bestGlobalScore: 74.8,
      bestGlobalScoreAt: '2026-07-10T10:00:00.000Z',
    },
    evolution: [],
    axes: [],
    radar: { first: [], last: [] },
  };
}

const CATALOG_SECTORS: SectorSummaryDto[] = [
  { code: Sector.RAILWAY, label: 'Ferroviaire', isActive: true },
  { code: Sector.HEALTHCARE, label: 'Santé', isActive: false },
  { code: Sector.AVIATION, label: 'Aérien', isActive: false },
  { code: Sector.SECURITY, label: 'Sécurité', isActive: false },
  { code: Sector.DRIVING, label: 'Conduite', isActive: false },
];

function buildInvoices(): BillingInvoiceDto[] {
  return [
    {
      id: 'in_1',
      createdAt: '2026-07-05T00:00:00.000Z',
      tier: SubscriptionTier.UNLIMITED,
      amount: 1499,
      status: InvoiceStatus.PAID,
      url: 'https://invoice.stripe.com/in_1',
    },
    {
      id: 'in_2',
      createdAt: '2026-06-05T00:00:00.000Z',
      tier: SubscriptionTier.ESSENTIAL,
      amount: 899,
      status: InvoiceStatus.PAID,
      url: null,
    },
  ];
}

interface SetupOptions {
  tier?: SubscriptionTier;
  user?: UserProfileDto;
  billingOverview?: BillingOverviewDto | null;
  changePasswordResult?: () => Observable<UserProfileDto>;
  invoicesResult?: () => Observable<BillingInvoiceDto[]>;
}

async function setup(options: SetupOptions = {}) {
  TestBed.resetTestingModule();
  const tier = options.tier ?? SubscriptionTier.UNLIMITED;
  const user = signal<UserProfileDto | null>(
    options.user ?? buildUser({ tier }),
  );
  const updateProfile = vi.fn((payload: { firstName: string; lastName: string }) => {
    const current = user();
    const updated = buildUser({ ...current, ...payload, tier });
    user.set(updated);
    return of(updated);
  });
  const overview =
    options.billingOverview !== undefined
      ? options.billingOverview
      : tier === SubscriptionTier.FREE
        ? buildBillingOverview({
            tier: SubscriptionTier.FREE,
            status: null,
            monthlyAmount: null,
            paymentMethod: null,
            currentPeriodEnd: null,
            nextInvoiceDate: null,
          })
        : buildBillingOverview({ tier });
  const billingOverview = signal<BillingOverviewDto | null>(overview);
  const loadBillingOverview = vi.fn(() =>
    overview ? of(overview) : of(null),
  );
  const cancelSubscription = vi.fn().mockReturnValue(of(undefined));
  const resumeSubscription = vi.fn().mockReturnValue(of(undefined));
  const listInvoices = vi.fn(() =>
    options.invoicesResult ? options.invoicesResult() : of(buildInvoices()),
  );
  const changePassword = vi.fn(() =>
    options.changePasswordResult
      ? options.changePasswordResult()
      : of(user() ?? buildUser({ tier })),
  );

  await TestBed.configureTestingModule({
    imports: [Profile],
    providers: [
      provideRouter([]),
      {
        provide: AuthFacade,
        useValue: {
          currentUser: user,
          updateProfile,
          changePassword,
          logout: vi.fn().mockReturnValue(of(undefined)),
        },
      },
      { provide: CoreFacade, useValue: { tier: signal(tier) } },
      { provide: EnergyFacade, useValue: { state: signal(buildEnergy()) } },
      {
        provide: SubscriptionsFacade,
        useValue: {
          billingOverview,
          billingLoading: signal(false),
          loadBillingOverview,
          cancelSubscription,
          resumeSubscription,
          listInvoices,
        },
      },
      {
        provide: CatalogFacade,
        useValue: {
          sectors: signal(CATALOG_SECTORS),
          sectorsError: signal(null),
        },
      },
    ],
  })
    .overrideComponent(Profile, {
      set: {
        providers: [
          {
            provide: ProgressionFacade,
            useValue: {
              progression: signal<ProgressionDto | null>(buildProgression()),
              loading: signal(false),
            },
          },
        ],
      },
    })
    .compileComponents();

  const fixture = TestBed.createComponent(Profile);
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  fixture.detectChanges();
  return {
    fixture,
    navigate,
    updateProfile,
    changePassword,
    loadBillingOverview,
    cancelSubscription,
    resumeSubscription,
    listInvoices,
  };
}

function textOf(fixture: { nativeElement: HTMLElement }): string {
  return fixture.nativeElement.textContent ?? '';
}

function navButtons(fixture: { nativeElement: HTMLElement }): HTMLButtonElement[] {
  return Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
      '.profil__nav-item',
    ),
  );
}

function input(
  fixture: { nativeElement: HTMLElement },
  index: number,
): HTMLInputElement {
  return fixture.nativeElement.querySelectorAll<HTMLInputElement>(
    '.profil__input',
  )[index];
}

describe('Profile', () => {
  it('renders the identity rail with the plan, sector and account facts', async () => {
    const { fixture } = await setup();
    expect(textOf(fixture)).toContain('Mohand Boudjema');
    expect(textOf(fixture)).toContain('Illimité · Ferroviaire');
    expect(textOf(fixture)).toContain('Informations personnelles');
    expect(textOf(fixture)).toContain('14 avril 2026');
    expect(textOf(fixture)).toContain('23');
    expect(input(fixture, 0).value).toBe('Mohand');
    expect(input(fixture, 1).value).toBe('Boudjema');
    expect(input(fixture, 2).disabled).toBe(true);
  });

  it('switches sections from the rail navigation', async () => {
    const { fixture } = await setup();
    const buttons = navButtons(fixture);
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'Informations',
      'Sécurité',
      'Secteur',
      'Abonnement',
      'Facturation',
    ]);

    buttons[2].click();
    fixture.detectChanges();
    expect(textOf(fixture)).toContain('Secteur de préparation');
    expect(
      fixture.nativeElement.querySelectorAll('.profil__sector'),
    ).toHaveLength(5);
    expect(
      fixture.nativeElement.querySelector('.profil__sector--active')
        ?.textContent,
    ).toContain('Ferroviaire');
    const coming = fixture.nativeElement.querySelectorAll(
      '.profil__sector--coming',
    );
    expect(coming).toHaveLength(4);
    expect(coming[0].textContent).toContain('À venir');
    expect(coming[0].getAttribute('aria-disabled')).toBe('true');
    expect(
      fixture.nativeElement.querySelector('.profil__sector--active')
        ?.textContent,
    ).not.toContain('À venir');

    buttons[3].click();
    fixture.detectChanges();
    expect(textOf(fixture)).toContain('14,99 €');
    expect(textOf(fixture)).toContain('Énergie du jour');
    expect(textOf(fixture)).toContain('Illimitée');
    expect(textOf(fixture)).toContain('Prochain renouvellement');
    expect(textOf(fixture)).toContain('5 août 2026');
    expect(textOf(fixture)).toContain("Changer d'offre");
    expect(textOf(fixture)).not.toContain('Gérer mon abonnement');
    expect(textOf(fixture)).toContain('Mastercard •••• 1234');
    expect(textOf(fixture)).toContain('Résilier mon abonnement');
    expect(textOf(fixture)).toContain(
      'La résiliation prend effet le 5 août 2026',
    );
    expect(textOf(fixture)).toContain('Prochaine facture le 5 août 2026');

    buttons[4].click();
    fixture.detectChanges();
    expect(textOf(fixture)).toContain('Google Pay');
    expect(textOf(fixture)).toContain('Mastercard •••• 1234');
    expect(textOf(fixture)).toContain('Expire 08/27');
    expect(textOf(fixture)).not.toContain('Prochaine facture');
    expect(textOf(fixture)).toContain('Aucun paiement en attente');
  });

  it('walks the footer states from idle to dirty to saved', async () => {
    const { fixture, updateProfile } = await setup();
    expect(textOf(fixture)).toContain('Aucune modification en attente');

    const firstName = input(fixture, 0);
    firstName.value = 'Idir';
    firstName.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(textOf(fixture)).toContain('Modifications non enregistrées');

    (
      fixture.nativeElement.querySelector(
        '.profil__action-save',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(updateProfile).toHaveBeenCalledWith({
      firstName: 'Idir',
      lastName: 'Boudjema',
    });
    expect(textOf(fixture)).toContain('Modifications enregistrées');
  });

  it('lists the stripe invoices with french amounts on the billing tab', async () => {
    const { fixture } = await setup();
    navButtons(fixture)[4].click();
    fixture.detectChanges();

    expect(textOf(fixture)).toContain('Reçus');
    const rows = fixture.nativeElement.querySelectorAll('.profil__invoice-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('05/07/2026');
    expect(rows[0].textContent).toContain('Illimité, mensuel');
    expect(rows[0].textContent).toContain('14,99 €');
    expect(rows[0].textContent).toContain('Payée');
    expect(
      rows[0].querySelector('.profil__invoice-link')?.getAttribute('href'),
    ).toBe('https://invoice.stripe.com/in_1');
    expect(rows[1].querySelector('.profil__invoice-link')).toBeNull();
  });

  it('shows locked-size invoice skeletons while the receipts are loading', async () => {
    const { fixture } = await setup({ invoicesResult: () => NEVER });
    navButtons(fixture)[4].click();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelectorAll('.profil__skeleton-invoice-date'),
    ).toHaveLength(2);
    expect(
      fixture.nativeElement.querySelectorAll('.profil__invoice-row'),
    ).toHaveLength(2);
    expect(textOf(fixture)).not.toContain("Aucun reçu pour l'instant.");
  });

  it('shows a clean empty state without invoices and an error state with retry', async () => {
    const empty = await setup({ invoicesResult: () => of([]) });
    navButtons(empty.fixture)[4].click();
    empty.fixture.detectChanges();
    expect(textOf(empty.fixture)).toContain("Aucun reçu pour l'instant.");

    const failing = await setup({
      invoicesResult: () => throwError(() => new Error('boom')),
    });
    navButtons(failing.fixture)[4].click();
    failing.fixture.detectChanges();
    expect(textOf(failing.fixture)).toContain('Impossible de charger vos reçus.');
    expect(
      failing.fixture.nativeElement.querySelector('.profil__invoices-retry'),
    ).not.toBeNull();
  });

  it('changes the password from the security tab and clears the form on success', async () => {
    const { fixture, changePassword } = await setup();
    navButtons(fixture)[1].click();
    fixture.detectChanges();

    expect(textOf(fixture)).toContain(
      'Modifiez votre mot de passe. Il vous sera demandé à chaque connexion.',
    );
    expect(textOf(fixture)).toContain('8 caractères minimum');
    expect(textOf(fixture)).not.toContain('Un chiffre');

    const fields = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>(
      '.profil__input',
    );
    fields[0].value = 'AncienSecret1';
    fields[0].dispatchEvent(new Event('input'));
    fields[1].value = 'NouveauSecret1';
    fields[1].dispatchEvent(new Event('input'));
    fields[2].value = 'NouveauSecret1';
    fields[2].dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(textOf(fixture)).toContain('Mots de passe identiques');
    (
      fixture.nativeElement.querySelector(
        '.profil__action-save',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: 'AncienSecret1',
      newPassword: 'NouveauSecret1',
    });
    expect(textOf(fixture)).toContain('Mot de passe mis à jour');
    expect(input(fixture, 0).value).toBe('');
  });

  it('surfaces an invalid current password error from the api', async () => {
    const { fixture, changePassword } = await setup({
      changePasswordResult: () =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { message: 'INVALID_CURRENT_PASSWORD' },
            }),
        ),
    });
    navButtons(fixture)[1].click();
    fixture.detectChanges();

    const fields = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>(
      '.profil__input',
    );
    fields[0].value = 'MauvaisActuel1';
    fields[0].dispatchEvent(new Event('input'));
    fields[1].value = 'NouveauSecret1';
    fields[1].dispatchEvent(new Event('input'));
    fields[2].value = 'NouveauSecret1';
    fields[2].dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector(
        '.profil__action-save',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(changePassword).toHaveBeenCalled();
    expect(textOf(fixture)).toContain('Mot de passe actuel invalide.');
  });

  it('keeps the save action inert while the password form is incomplete', async () => {
    const { fixture, changePassword } = await setup();
    navButtons(fixture)[1].click();
    fixture.detectChanges();

    const fields = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>(
      '.profil__input',
    );
    fields[0].value = 'AncienSecret1';
    fields[0].dispatchEvent(new Event('input'));
    fields[1].value = 'court';
    fields[1].dispatchEvent(new Event('input'));
    fields[2].value = 'court';
    fields[2].dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector(
        '.profil__action-save',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(changePassword).not.toHaveBeenCalled();
  });

  it('cancels pending edits back to the stored profile', async () => {
    const { fixture, updateProfile } = await setup();
    const firstName = input(fixture, 0);
    firstName.value = 'Idir';
    firstName.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector(
        '.profil__action-cancel',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(input(fixture, 0).value).toBe('Mohand');
    expect(textOf(fixture)).toContain('Aucune modification en attente');
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('hides billing for the free plan and shows the no-subscription state', async () => {
    const { fixture, listInvoices } = await setup({
      tier: SubscriptionTier.FREE,
      user: buildUser({ tier: SubscriptionTier.FREE, subscription: null }),
    });
    expect(
      navButtons(fixture).map((button) => button.textContent?.trim()),
    ).toEqual(['Informations', 'Sécurité', 'Secteur', 'Abonnement']);
    expect(listInvoices).not.toHaveBeenCalled();

    navButtons(fixture)[3].click();
    fixture.detectChanges();
    expect(textOf(fixture)).toContain('Découverte');
    expect(textOf(fixture)).toContain('Gratuit');
    expect(textOf(fixture)).toContain('Choisir une formule');
    expect(textOf(fixture)).toContain('Mode découverte seul');
    expect(textOf(fixture)).toContain('Sans limite');
    expect(textOf(fixture)).toContain('Aucune facturation en cours');
    expect(textOf(fixture)).not.toContain('Résilier');
    expect(textOf(fixture)).not.toContain('Gérer mon abonnement');
  });

  it('cancels in-app after an inline confirmation without leaving the page', async () => {
    const { fixture, cancelSubscription, navigate } = await setup();
    navButtons(fixture)[3].click();
    fixture.detectChanges();

    const cancelButton = () =>
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        '.profil__plan-row button',
      );
    expect(cancelButton()?.textContent).toContain('Résilier');
    cancelButton()?.click();
    fixture.detectChanges();

    expect(cancelSubscription).not.toHaveBeenCalled();
    expect(textOf(fixture)).toContain('Confirmer la résiliation');

    cancelButton()?.click();
    fixture.detectChanges();

    expect(cancelSubscription).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('renders the scheduled cancellation state with a reactivate action', async () => {
    const { fixture, resumeSubscription } = await setup({
      billingOverview: buildBillingOverview({
        cancelAtPeriodEnd: true,
        canceledAt: '2026-07-20T10:00:00.000Z',
        nextInvoiceDate: null,
      }),
    });
    navButtons(fixture)[3].click();
    fixture.detectChanges();

    expect(textOf(fixture)).toContain('Résiliation programmée');
    expect(textOf(fixture)).toContain("Accès jusqu'au 5 août 2026");
    expect(textOf(fixture)).toContain('Réactiver');
    expect(textOf(fixture)).not.toContain('Résilier mon abonnement');
    expect(textOf(fixture)).not.toContain('Prochaine facture');

    const reactivate = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        '.profil__plan-row button',
      ),
    ).find((button) => button.textContent?.includes('Réactiver'));
    reactivate?.click();
    expect(resumeSubscription).toHaveBeenCalledTimes(1);
  });

  it('renders the past due alert with an in-app payment method link', async () => {
    const { fixture } = await setup({
      billingOverview: buildBillingOverview({
        status: SubscriptionStatus.PAST_DUE,
        nextInvoiceDate: null,
      }),
    });
    navButtons(fixture)[3].click();
    fixture.detectChanges();

    expect(textOf(fixture)).toContain('Paiement en échec');
    const updateCta = (fixture.nativeElement as HTMLElement).querySelector(
      '.profil__alert ui-button',
    ) as HTMLElement;
    expect(updateCta.textContent).toContain(
      'Mettre à jour le moyen de paiement',
    );
    expect(updateCta.getAttribute('routerLink')).toBe('/paiement/carte');
  });

  it('loads the billing overview with reconciliation on init', async () => {
    const { loadBillingOverview } = await setup();
    expect(loadBillingOverview).toHaveBeenCalledWith(true);
  });
});
