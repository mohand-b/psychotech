import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  EnergyStateDto,
  Sector,
  UserProfileDto,
} from '@psychotech/shared';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { ProgressionFacade } from '../../../progression/data-access/progression.facade';
import { Profile } from './profile';

function buildUser(overrides: Partial<UserProfileDto> = {}): UserProfileDto {
  return {
    id: 'user-1',
    email: 'mohand@example.com',
    firstName: 'Mohand',
    lastName: 'Kaci',
    locale: 'fr-FR',
    timezone: 'Europe/Paris',
    currentSector: Sector.RAILWAY,
    showInFeed: false,
    emailVerifiedAt: '2026-04-14T10:00:00.000Z',
    pendingEmail: null,
    passwordChangedAt: '2026-04-14T10:00:00.000Z',
    lastLoginAt: '2026-08-08T09:12:00.000Z',
    createdAt: '2026-04-14T00:00:00.000Z',
    ...overrides,
  };
}

function energyState(balance: number): EnergyStateDto {
  return { balance, canStartFull: balance >= 5, canStartAxis: balance >= 1 };
}

async function setup(user: UserProfileDto = buildUser()) {
  const userSignal = signal<UserProfileDto | null>(user);
  const updateProfile = vi.fn().mockReturnValue(of(user));
  const requestEmailChange = vi.fn().mockReturnValue(
    of({ sent: true, retryAfterSeconds: null, pendingEmail: null }),
  );
  const changePassword = vi.fn().mockReturnValue(of(user));
  const deleteAccount = vi.fn().mockReturnValue(of(undefined));
  const resendVerification = vi
    .fn()
    .mockReturnValue(of({ sent: true, retryAfterSeconds: null }));
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [Profile],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: AuthFacade,
        useValue: {
          currentUser: userSignal.asReadonly(),
          updateProfile,
          requestEmailChange,
          changePassword,
          deleteAccount,
          resendVerification,
          logout: vi.fn().mockReturnValue(of(undefined)),
        },
      },
      {
        provide: EnergyFacade,
        useValue: {
          state: signal(energyState(12)),
          load: () => of(energyState(12)),
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
              progression: signal({ stats: { completedSessions: 23 } }),
            },
          },
        ],
      },
    })
    .compileComponents();
  const fixture = TestBed.createComponent(Profile);
  fixture.detectChanges();
  const controller = TestBed.inject(HttpTestingController);
  controller
    .match((request) => request.url.endsWith('/me/badges'))
    .forEach((request) => request.flush([]));
  controller
    .match((request) => request.url.endsWith('/billing/purchases'))
    .forEach((request) =>
      request.flush([
        {
          id: 'purchase-1',
          purchasedAt: '2026-07-28T10:00:00.000Z',
          packId: 'PRE_EXAM',
          energyAmount: 50,
          amountCents: 790,
          receiptUrl: 'https://pay.stripe.com/receipts/abc',
        },
      ]),
    );
  await fixture.whenStable();
  fixture.detectChanges();
  return {
    fixture,
    userSignal,
    updateProfile,
    requestEmailChange,
    changePassword,
    deleteAccount,
  };
}

function element(fixture: ComponentFixture<Profile>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function clickButton(
  fixture: ComponentFixture<Profile>,
  label: string,
): void {
  const button = Array.from(
    element(fixture).querySelectorAll<HTMLButtonElement>('button'),
  ).find((candidate) => candidate.textContent?.trim().startsWith(label));
  button?.click();
  fixture.detectChanges();
}

describe('Profile - informations', () => {
  it('shows the read mode with the verified badge and the meta strip', async () => {
    const { fixture } = await setup();
    const text = element(fixture).textContent ?? '';
    expect(text).toContain('Informations personnelles');
    expect(text).toContain('Vérifiée');
    expect(text).toContain('Membre depuis');
    expect(text).toContain('14 avril 2026');
    expect(text).toContain('23');
    expect(text).toContain('sur 20');
    expect(text).toContain('Dernière connexion');
  });

  it('requests an email change when the saved email differs', async () => {
    const { fixture, updateProfile, requestEmailChange } = await setup();
    clickButton(fixture, 'Modifier');

    const emailInput = element(fixture).querySelector<HTMLInputElement>(
      'input[type="email"]',
    ) as HTMLInputElement;
    emailInput.value = 'nouvelle@example.com';
    emailInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    clickButton(fixture, 'Enregistrer');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(updateProfile).toHaveBeenCalledWith({
      firstName: 'Mohand',
      lastName: 'Kaci',
    });
    expect(requestEmailChange).toHaveBeenCalledWith('nouvelle@example.com');
    expect(element(fixture).textContent).toContain(
      'Email envoyé à nouvelle@example.com',
    );
  });

  it('never requests an email change when only the names change', async () => {
    const { fixture, updateProfile, requestEmailChange } = await setup();
    clickButton(fixture, 'Modifier');

    const inputs = element(fixture).querySelectorAll<HTMLInputElement>(
      '.profil__form input',
    );
    inputs[0].value = 'Idir';
    inputs[0].dispatchEvent(new Event('input'));
    fixture.detectChanges();

    clickButton(fixture, 'Enregistrer');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(updateProfile).toHaveBeenCalledWith({
      firstName: 'Idir',
      lastName: 'Kaci',
    });
    expect(requestEmailChange).not.toHaveBeenCalled();
  });

  it('shows the pending change state with its resend action', async () => {
    const { fixture } = await setup(
      buildUser({ pendingEmail: 'attente@example.com' }),
    );
    const text = element(fixture).textContent ?? '';
    expect(text).toContain('Changement en attente');
    expect(text).toContain('Confirmation attendue sur attente@example.com');
  });
});

describe('Profile - sécurité', () => {
  it('updates the password once every criterion is satisfied', async () => {
    const { fixture, changePassword } = await setup();
    clickButton(fixture, 'Sécurité');

    const inputs = element(fixture).querySelectorAll<HTMLInputElement>(
      '.profil__security input',
    );
    inputs[0].value = 'ancien-mdp';
    inputs[0].dispatchEvent(new Event('input'));
    inputs[1].value = 'Nouveau1234';
    inputs[1].dispatchEvent(new Event('input'));
    inputs[2].value = 'Nouveau1234';
    inputs[2].dispatchEvent(new Event('input'));
    fixture.detectChanges();

    clickButton(fixture, 'Mettre à jour le mot de passe');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: 'ancien-mdp',
      newPassword: 'Nouveau1234',
    });
    expect(element(fixture).textContent).toContain('Mot de passe mis à jour');
  });
});

describe('Profile - confidentialité', () => {
  it('saves the feed opt-in immediately from the toggle', async () => {
    const { fixture, updateProfile } = await setup();
    clickButton(fixture, 'Confidentialité');

    const toggle = element(fixture).querySelector<HTMLButtonElement>(
      '.ui-toggle',
    );
    toggle?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(updateProfile).toHaveBeenCalledWith({ showInFeed: true });
    expect(element(fixture).textContent).toContain('Mohand a décroché Cartésien');
  });
});

describe('Profile - crédits et reçus', () => {
  it('lists the receipts with their download link and the shared balance', async () => {
    const { fixture } = await setup();
    clickButton(fixture, 'Crédits et reçus');
    const text = element(fixture).textContent ?? '';
    expect(text).toContain('12');
    expect(text).toContain('crédits disponibles');
    expect(text).toContain("Pack Avant l'examen");
    expect(text).toContain('7,90 €');
    const link = element(fixture).querySelector<HTMLAnchorElement>(
      '.profil__receipt-link',
    );
    expect(link?.getAttribute('href')).toBe(
      'https://pay.stripe.com/receipts/abc',
    );
  });
});

describe('Profile - suppression', () => {
  it('requires the password and the exact confirmation word', async () => {
    const { fixture, deleteAccount } = await setup();
    clickButton(fixture, 'Supprimer');
    fixture.detectChanges();

    const modal = element(fixture).querySelector('.profil__modal');
    expect(modal).not.toBeNull();

    const inputs = (modal as Element).querySelectorAll<HTMLInputElement>('input');
    inputs[0].value = 'mon-mdp';
    inputs[0].dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const confirmButton = Array.from(
      element(fixture).querySelectorAll<HTMLButtonElement>('button'),
    ).find((candidate) =>
      candidate.textContent?.includes('Supprimer définitivement'),
    );
    expect(confirmButton?.disabled).toBe(true);

    inputs[1].value = 'SUPPRIMER';
    inputs[1].dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(confirmButton?.disabled).toBe(false);

    confirmButton?.click();
    await fixture.whenStable();

    expect(deleteAccount).toHaveBeenCalledWith({
      password: 'mon-mdp',
      confirmation: 'SUPPRIMER',
    });
  });
});
