import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import {
  ResendVerificationResponseDto,
  Sector,
  UserProfileDto,
} from '@psychotech/shared';
import { Observable, of } from 'rxjs';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { AuthFacade } from '../../data-access/auth.facade';
import { VerificationPending } from './verification-pending';

function buildUser(emailVerifiedAt: string | null): UserProfileDto {
  return {
    id: 'user-1',
    email: 'mohand@example.com',
    firstName: 'Mohand',
    lastName: 'Boudjema',
    locale: 'fr-FR',
    timezone: 'Europe/Paris',
    currentSector: Sector.RAILWAY,
    showInFeed: false,
    pendingEmail: null,
    passwordChangedAt: null,
    lastLoginAt: null,
    emailVerifiedAt,
    examGuideReadAt: null,
    logicGuideReadAt: null,
    createdAt: '2026-06-01T00:00:00.000Z',
  };
}

interface Setup {
  fixture: ComponentFixture<VerificationPending>;
  element: HTMLElement;
  currentUser: WritableSignal<UserProfileDto | null>;
  loadCurrentUser: ReturnType<typeof vi.fn>;
  resendVerification: ReturnType<typeof vi.fn>;
  energyLoad: ReturnType<typeof vi.fn>;
  navigate: ReturnType<typeof vi.spyOn>;
}

interface SetupOptions {
  emailVerifiedAt?: string | null;
  resendResult?: () => Observable<ResendVerificationResponseDto>;
}

async function setup(options: SetupOptions = {}): Promise<Setup> {
  const currentUser = signal<UserProfileDto | null>(
    buildUser(options.emailVerifiedAt ?? null),
  );
  const loadCurrentUser = vi.fn(() => of(currentUser()));
  const resendVerification = vi.fn(
    options.resendResult ??
      (() =>
        of<ResendVerificationResponseDto>({ sent: true, retryAfterSeconds: null })),
  );
  const energyLoad = vi.fn(() => of(null));
  await TestBed.configureTestingModule({
    imports: [VerificationPending],
    providers: [
      provideRouter([]),
      {
        provide: AuthFacade,
        useValue: { currentUser, loadCurrentUser, resendVerification },
      },
      { provide: EnergyFacade, useValue: { load: energyLoad } },
    ],
  }).compileComponents();
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(VerificationPending);
  fixture.detectChanges();
  return {
    fixture,
    element: fixture.nativeElement,
    currentUser,
    loadCurrentUser,
    resendVerification,
    energyLoad,
    navigate,
  };
}

function buttons(element: HTMLElement): HTMLButtonElement[] {
  return Array.from(
    element.querySelectorAll<HTMLButtonElement>('ui-button button'),
  );
}

function continueButton(element: HTMLElement): HTMLButtonElement {
  const found = buttons(element).find((candidate) =>
    candidate.textContent?.includes('Continuer sans attendre'),
  );
  if (!found) {
    throw new Error('continue button missing');
  }
  return found;
}

function resendButton(element: HTMLElement): HTMLButtonElement {
  const found = buttons(element).find((candidate) =>
    candidate.textContent?.includes('Renvoyer'),
  );
  if (!found) {
    throw new Error('resend button missing');
  }
  return found;
}

describe('VerificationPending', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('announces the sent link with the account email and resends it', async () => {
    const result = await setup();

    expect(result.element.textContent).toContain('Vérifiez votre adresse email');
    expect(result.element.textContent).toContain('mohand@example.com');
    expect(result.element.textContent).not.toContain('crédit');

    resendButton(result.element).click();
    result.fixture.detectChanges();

    expect(result.resendVerification).toHaveBeenCalledTimes(1);
    expect(result.element.textContent).toContain('Email renvoyé');
  });

  it('lets the candidate continue to the dashboard without waiting', async () => {
    const result = await setup();

    continueButton(result.element).click();

    expect(result.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('shows a decreasing cooldown inside the disabled resend button', async () => {
    const result = await setup({
      resendResult: () =>
        of<ResendVerificationResponseDto>({ sent: false, retryAfterSeconds: 42 }),
    });

    resendButton(result.element).click();
    result.fixture.detectChanges();

    expect(resendButton(result.element).textContent).toContain(
      'Renvoyer dans 42',
    );
    expect(resendButton(result.element).disabled).toBe(true);

    vi.advanceTimersByTime(1000);
    result.fixture.detectChanges();
    expect(resendButton(result.element).textContent).toContain(
      'Renvoyer dans 41',
    );
  });

  it('polls the profile and leaves for the dashboard once verified elsewhere', async () => {
    const result = await setup();
    expect(result.loadCurrentUser).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);
    expect(result.loadCurrentUser).toHaveBeenCalledTimes(1);

    result.currentUser.set(buildUser('2026-08-06T10:00:00.000Z'));
    result.fixture.detectChanges();

    expect(result.energyLoad).toHaveBeenCalled();
    expect(result.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('redirects immediately when the account arrives already verified', async () => {
    const result = await setup({
      emailVerifiedAt: '2026-08-06T10:00:00.000Z',
    });

    expect(result.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('links the wrong-address case to the profile', async () => {
    const result = await setup();

    const link = result.element.querySelector<HTMLAnchorElement>(
      '.authcard__aside-link',
    );
    expect(link?.getAttribute('href')).toBe('/profil');
  });
});
