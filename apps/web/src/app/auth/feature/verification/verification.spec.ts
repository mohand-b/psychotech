import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import {
  ResendVerificationResponseDto,
  VerifyEmailResponseDto,
} from '@psychotech/shared';
import { Observable, of, throwError } from 'rxjs';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { AuthFacade } from '../../data-access/auth.facade';
import { Verification } from './verification';

interface SetupOptions {
  token?: string | null;
  authenticated?: boolean;
  verifyResult?: () => Observable<VerifyEmailResponseDto>;
  resendResult?: () => Observable<ResendVerificationResponseDto>;
}

interface Setup {
  fixture: ComponentFixture<Verification>;
  element: HTMLElement;
  verifyEmail: ReturnType<typeof vi.fn>;
  resendVerification: ReturnType<typeof vi.fn>;
  loadCurrentUser: ReturnType<typeof vi.fn>;
  energyLoad: ReturnType<typeof vi.fn>;
  navigate: ReturnType<typeof vi.spyOn>;
}

async function setup(options: SetupOptions = {}): Promise<Setup> {
  const verifyEmail = vi.fn(
    options.verifyResult ??
      (() => of<VerifyEmailResponseDto>({ outcome: 'VERIFIED', grantedEnergy: 5 })),
  );
  const resendVerification = vi.fn(
    options.resendResult ??
      (() =>
        of<ResendVerificationResponseDto>({ sent: true, retryAfterSeconds: null })),
  );
  const loadCurrentUser = vi.fn(() => of(null));
  const energyLoad = vi.fn(() => of(null));
  await TestBed.configureTestingModule({
    imports: [Verification],
    providers: [
      provideRouter([]),
      {
        provide: AuthFacade,
        useValue: {
          verifyEmail,
          resendVerification,
          loadCurrentUser,
          isAuthenticated: () => options.authenticated ?? false,
        },
      },
      { provide: EnergyFacade, useValue: { load: energyLoad } },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParamMap: convertToParamMap(
              options.token === null ? {} : { token: options.token ?? 'a'.repeat(64) },
            ),
          },
        },
      },
    ],
  }).compileComponents();
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(Verification);
  fixture.detectChanges();
  return {
    fixture,
    element: fixture.nativeElement,
    verifyEmail,
    resendVerification,
    loadCurrentUser,
    energyLoad,
    navigate,
  };
}

function ctaButton(element: HTMLElement): HTMLButtonElement {
  return element.querySelector('ui-button button') as HTMLButtonElement;
}

describe('Verification', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('confirms the address with the energy credit and refreshes the connected account', async () => {
    const result = await setup({ authenticated: true });

    expect(result.verifyEmail).toHaveBeenCalledWith('a'.repeat(64));
    expect(result.element.textContent).toContain('Adresse vérifiée');
    expect(result.element.textContent).toContain('5');
    expect(result.element.textContent).toContain('énergies créditées');
    expect(result.loadCurrentUser).toHaveBeenCalled();
    expect(result.energyLoad).toHaveBeenCalled();

    const cta = ctaButton(result.element);
    expect(cta.textContent).toContain("Commencer l'entraînement");
    cta.click();
    expect(result.navigate).toHaveBeenCalledWith(['/entrainements']);
  });

  it('sends the visitor to the login after a verification done while logged out', async () => {
    const result = await setup({ authenticated: false });

    expect(result.element.textContent).toContain('Adresse vérifiée');
    expect(result.loadCurrentUser).not.toHaveBeenCalled();
    expect(result.energyLoad).not.toHaveBeenCalled();

    const cta = ctaButton(result.element);
    expect(cta.textContent).toContain('Se connecter');
    cta.click();
    expect(result.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('mentions no energy credit for an already verified address', async () => {
    const result = await setup({
      authenticated: true,
      verifyResult: () =>
        of<VerifyEmailResponseDto>({ outcome: 'ALREADY_VERIFIED', grantedEnergy: 0 }),
    });

    expect(result.element.textContent).toContain('Adresse déjà vérifiée');
    expect(result.element.textContent).not.toContain('énergies créditées');
    expect(result.energyLoad).not.toHaveBeenCalled();
    expect(ctaButton(result.element).textContent).toContain(
      "Commencer l'entraînement",
    );
  });

  it('offers to resend the email on an expired link for a connected user', async () => {
    const result = await setup({
      authenticated: true,
      verifyResult: () =>
        of<VerifyEmailResponseDto>({ outcome: 'EXPIRED', grantedEnergy: 0 }),
    });

    expect(result.element.textContent).toContain('Lien expiré');
    const cta = ctaButton(result.element);
    expect(cta.textContent).toContain("Renvoyer l'e-mail");
    cta.click();
    result.fixture.detectChanges();

    expect(result.resendVerification).toHaveBeenCalledTimes(1);
    expect(result.element.textContent).toContain('E-mail renvoyé.');
  });

  it('invites a logged out visitor to sign in on an expired link', async () => {
    const result = await setup({
      authenticated: false,
      verifyResult: () =>
        of<VerifyEmailResponseDto>({ outcome: 'EXPIRED', grantedEnergy: 0 }),
    });

    expect(result.element.textContent).toContain('Lien expiré');
    expect(ctaButton(result.element).textContent).toContain('Se connecter');
  });

  it('rejects a missing token without calling the api', async () => {
    const result = await setup({ token: null });

    expect(result.verifyEmail).not.toHaveBeenCalled();
    expect(result.element.textContent).toContain('Lien invalide');
  });

  it('treats an api refusal as an invalid link', async () => {
    const result = await setup({
      verifyResult: () => throwError(() => new Error('boom')),
    });

    expect(result.element.textContent).toContain('Lien invalide');
  });
});
