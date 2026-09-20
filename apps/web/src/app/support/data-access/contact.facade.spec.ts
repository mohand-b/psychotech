import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  CONTACT_FORM_EXPIRED_ERROR_CODE,
  ContactProblemLocation,
  ContactReason,
  ContactReceiptDto,
  SubmitContactDto,
} from '@psychotech/shared';
import { Observable, of, throwError } from 'rxjs';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { ContactDraft, ContactFacade } from './contact.facade';
import { SupportApi } from './support.api';

const RECEIPT: ContactReceiptDto = {
  reference: 'C-00042',
  email: 'visiteur@exemple.fr',
};

function draft(overrides: Partial<ContactDraft> = {}): ContactDraft {
  return {
    reason: ContactReason.QUESTION,
    email: 'visiteur@exemple.fr',
    subject: '',
    area: null,
    location: null,
    message: 'Comment fonctionne le calcul du score global ?',
    honeypot: '',
    technicalContext: null,
    sessionId: null,
    screenshot: null,
    ...overrides,
  };
}

describe('ContactFacade', () => {
  let authenticated: WritableSignal<boolean>;
  let formToken: ReturnType<typeof vi.fn>;
  let submitAnonymously: ReturnType<typeof vi.fn>;
  let submitFromAccount: ReturnType<typeof vi.fn>;

  function setup(
    outcome: () => Observable<ContactReceiptDto> = () => of(RECEIPT),
  ): ContactFacade {
    authenticated = signal(false);
    formToken = vi.fn(() => of({ token: 'token-1' }));
    submitAnonymously = vi.fn(outcome);
    submitFromAccount = vi.fn(outcome);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthFacade, useValue: { isAuthenticated: authenticated } },
        {
          provide: SupportApi,
          useValue: { formToken, submitAnonymously, submitFromAccount },
        },
      ],
    });
    return TestBed.inject(ContactFacade);
  }

  function sentMessage(api: ReturnType<typeof vi.fn>): SubmitContactDto {
    return api.mock.calls[0][0] as SubmitContactDto;
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('ne demande le jeton de formulaire qu’une seule fois', () => {
    const facade = setup();
    facade.prepare();
    facade.prepare();
    expect(formToken).toHaveBeenCalledTimes(1);
  });

  it('envoie un visiteur sans compte sur la route publique, avec son email et le jeton', () => {
    const facade = setup();
    facade.prepare();
    facade.submit(draft());

    expect(submitFromAccount).not.toHaveBeenCalled();
    expect(sentMessage(submitAnonymously)).toEqual({
      reason: ContactReason.QUESTION,
      message: 'Comment fonctionne le calcul du score global ?',
      formToken: 'token-1',
      website: '',
      email: 'visiteur@exemple.fr',
    });
    expect(facade.status()).toBe('sent');
    expect(facade.receipt()).toEqual(RECEIPT);
  });

  it('envoie un utilisateur connecté sur la route de compte, sans jamais transmettre d’email', () => {
    const facade = setup();
    authenticated.set(true);
    facade.submit(draft({ email: 'autre@exemple.fr' }));

    expect(submitAnonymously).not.toHaveBeenCalled();
    expect(sentMessage(submitFromAccount)).not.toHaveProperty('email');
  });

  it('n’ajoute ni contexte technique, ni session, ni capture quand ils sont absents du brouillon', () => {
    const facade = setup();
    facade.submit(
      draft({
        reason: ContactReason.BUG_REPORT,
        location: ContactProblemLocation.EXAM,
      }),
    );

    const message = sentMessage(submitAnonymously);
    expect(message).not.toHaveProperty('technicalContext');
    expect(message).not.toHaveProperty('sessionId');
    expect(message).not.toHaveProperty('screenshot');
    expect(message.location).toBe(ContactProblemLocation.EXAM);
  });

  it('joint le contexte technique et la session quand le brouillon les porte', () => {
    const facade = setup();
    const technicalContext = {
      pageUrl: 'https://psychotech.test/contact',
      userAgent: 'Navigateur de test',
      viewport: '390x844',
    };
    facade.submit(
      draft({
        reason: ContactReason.BUG_REPORT,
        location: ContactProblemLocation.RESULTS,
        technicalContext,
        sessionId: 'session-1',
      }),
    );

    const message = sentMessage(submitAnonymously);
    expect(message.technicalContext).toEqual(technicalContext);
    expect(message.sessionId).toBe('session-1');
  });

  it('récupère un jeton au moment de l’envoi si la préparation n’a pas abouti', () => {
    const facade = setup();
    facade.submit(draft());

    expect(formToken).toHaveBeenCalledTimes(1);
    expect(sentMessage(submitAnonymously).formToken).toBe('token-1');
  });

  it('signale une limite d’envoi sans la confondre avec une panne', () => {
    const facade = setup(() =>
      throwError(
        () => new HttpErrorResponse({ status: HttpStatusCode.TooManyRequests }),
      ),
    );
    facade.submit(draft());
    expect(facade.status()).toBe('rate-limited');
  });

  it('signale une panne et permet de renvoyer le même message', () => {
    const facade = setup(() =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: HttpStatusCode.ServiceUnavailable,
          }),
      ),
    );
    facade.submit(draft());
    expect(facade.status()).toBe('failed');

    facade.submit(draft());
    expect(submitAnonymously).toHaveBeenCalledTimes(2);
  });

  it('renouvelle le jeton quand le serveur le déclare expiré', () => {
    const facade = setup(() =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: HttpStatusCode.BadRequest,
            error: { code: CONTACT_FORM_EXPIRED_ERROR_CODE },
          }),
      ),
    );
    facade.prepare();
    facade.submit(draft());

    expect(facade.status()).toBe('failed');
    expect(formToken).toHaveBeenCalledTimes(2);
  });

  it('repart d’un état neuf pour un autre message', () => {
    const facade = setup();
    facade.submit(draft());
    facade.startAnother();

    expect(facade.status()).toBe('idle');
    expect(facade.receipt()).toBeNull();
    expect(formToken).toHaveBeenCalledTimes(2);
  });
});
