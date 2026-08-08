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
    emailVerifiedAt,
    createdAt: '2026-06-01T00:00:00.000Z',
  };
}

interface Setup {
  fixture: ComponentFixture<VerificationPending>;
  element: HTMLElement;
  currentUser: WritableSignal<UserProfileDto | null>;
  loadCurrentUser: ReturnType<typeof vi.fn>;
  resendVerification: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
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
  const logout = vi.fn(() => of(undefined));
  const energyLoad = vi.fn(() => of(null));
  await TestBed.configureTestingModule({
    imports: [VerificationPending],
    providers: [
      provideRouter([]),
      {
        provide: AuthFacade,
        useValue: { currentUser, loadCurrentUser, resendVerification, logout },
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
    logout,
    energyLoad,
    navigate,
  };
}

function resendButton(element: HTMLElement): HTMLButtonElement {
  return element.querySelector('ui-button button') as HTMLButtonElement;
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

    expect(result.element.textContent).toContain(
      'Vérifiez votre adresse e-mail',
    );
    expect(result.element.textContent).toContain('mohand@example.com');
    expect(result.element.textContent).toContain('24');

    resendButton(result.element).click();
    result.fixture.detectChanges();

    expect(result.resendVerification).toHaveBeenCalledTimes(1);
    expect(result.element.textContent).toContain('E-mail renvoyé.');
  });

  it('shows a decreasing cooldown and disables the resend when rate limited', async () => {
    const result = await setup({
      resendResult: () =>
        of<ResendVerificationResponseDto>({ sent: false, retryAfterSeconds: 42 }),
    });

    resendButton(result.element).click();
    result.fixture.detectChanges();

    expect(result.element.textContent).toContain(
      'Vous pourrez renvoyer un e-mail dans 42',
    );
    expect(resendButton(result.element).disabled).toBe(true);

    vi.advanceTimersByTime(1000);
    result.fixture.detectChanges();
    expect(result.element.textContent).toContain(
      'Vous pourrez renvoyer un e-mail dans 41',
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

  it('logs the user out from the footer link', async () => {
    const result = await setup();

    (
      result.element.querySelector(
        '.verification-pending__logout',
      ) as HTMLButtonElement
    ).click();

    expect(result.logout).toHaveBeenCalledTimes(1);
    expect(result.navigate).toHaveBeenCalledWith(['/login']);
  });
});
