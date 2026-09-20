import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import {
  ContactProblemLocation,
  ContactReason,
  SessionHistoryItemDto,
  UserProfileDto,
} from '@psychotech/shared';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { SessionHistoryFacade } from '../../../sessions/data-access/session-history.facade';
import {
  ContactDraft,
  ContactFacade,
  ContactSendStatus,
} from '../../data-access/contact.facade';
import { ContactForm } from './contact-form';

const ACCOUNT_EMAIL = 'camille@exemple.fr';
const SESSION_ID = 'd0f0afce-0000-4000-8000-000000000000';
const VALID_MESSAGE = 'Le bilan affiche un score qui ne correspond pas.';

class ResizeObserverStub implements ResizeObserver {
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();
}

describe('ContactForm', () => {
  let status: WritableSignal<ContactSendStatus>;
  let submit: ReturnType<typeof vi.fn>;
  let prepare: ReturnType<typeof vi.fn>;
  let loadHistory: ReturnType<typeof vi.fn>;
  let fixture: ComponentFixture<ContactForm>;
  const originalMatchMedia = window.matchMedia;

  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    window.matchMedia = originalMatchMedia;
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  async function setup(options: {
    authenticated: boolean;
    queryParams?: Record<string, string>;
    history?: SessionHistoryItemDto[];
  }): Promise<HTMLElement> {
    status = signal<ContactSendStatus>('idle');
    submit = vi.fn();
    prepare = vi.fn();
    loadHistory = vi.fn();
    await TestBed.configureTestingModule({
      imports: [ContactForm],
      providers: [
        {
          provide: ContactFacade,
          useValue: { status, submit, prepare },
        },
        {
          provide: AuthFacade,
          useValue: {
            isAuthenticated: signal(options.authenticated),
            currentUser: signal(
              options.authenticated
                ? ({ email: ACCOUNT_EMAIL } as UserProfileDto)
                : null,
            ),
          },
        },
        {
          provide: SessionHistoryFacade,
          useValue: {
            items: signal(options.history ?? []),
            load: loadHistory,
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(options.queryParams ?? {}),
            },
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ContactForm);
    fixture.detectChanges();
    TestBed.tick();
    return fixture.nativeElement as HTMLElement;
  }

  function type(
    element: HTMLInputElement | HTMLTextAreaElement,
    value: string,
  ) {
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function choose(element: HTMLSelectElement, value: string) {
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
  }

  function toggle(element: HTMLInputElement) {
    element.click();
    fixture.detectChanges();
  }

  function sendButton(host: HTMLElement): HTMLButtonElement {
    return host.querySelector('.form__send button') as HTMLButtonElement;
  }

  function submittedDraft(): ContactDraft {
    return submit.mock.calls[0][0] as ContactDraft;
  }

  it('garde l’envoi bloqué tant que l’email et le message ne sont pas valides', async () => {
    const host = await setup({ authenticated: false });
    expect(sendButton(host).disabled).toBe(true);

    type(
      host.querySelector('input[type=email]') as HTMLInputElement,
      'pas-un-email',
    );
    type(host.querySelector('textarea') as HTMLTextAreaElement, VALID_MESSAGE);
    expect(sendButton(host).disabled).toBe(true);

    type(
      host.querySelector('input[type=email]') as HTMLInputElement,
      'visiteur@exemple.fr',
    );
    expect(sendButton(host).disabled).toBe(false);
  });

  it('soumet une question sans aucune donnée technique', async () => {
    const host = await setup({ authenticated: false });
    type(
      host.querySelector('input[type=email]') as HTMLInputElement,
      'visiteur@exemple.fr',
    );
    type(host.querySelector('textarea') as HTMLTextAreaElement, VALID_MESSAGE);
    sendButton(host).click();

    expect(submittedDraft()).toMatchObject({
      reason: ContactReason.QUESTION,
      email: 'visiteur@exemple.fr',
      message: VALID_MESSAGE,
      honeypot: '',
      technicalContext: null,
      sessionId: null,
      screenshot: null,
    });
  });

  it('exige le lieu du problème avant de laisser signaler', async () => {
    const host = await setup({ authenticated: false });
    fixture.componentRef.setInput('motif', 'probleme');
    fixture.detectChanges();
    type(
      host.querySelector('input[type=email]') as HTMLInputElement,
      'visiteur@exemple.fr',
    );
    type(host.querySelector('textarea') as HTMLTextAreaElement, VALID_MESSAGE);
    expect(sendButton(host).disabled).toBe(true);

    choose(
      host.querySelector('select') as HTMLSelectElement,
      ContactProblemLocation.CREDITS_OR_PAYMENT,
    );
    expect(sendButton(host).disabled).toBe(false);

    sendButton(host).click();
    expect(submittedDraft().reason).toBe(ContactReason.PAYMENT_ISSUE);
    expect(submittedDraft().technicalContext).toMatchObject({
      viewport: expect.stringMatching(/^\d+x\d+$/),
    });
  });

  it('ne collecte aucun contexte technique quand la case est décochée', async () => {
    const host = await setup({ authenticated: false });
    fixture.componentRef.setInput('motif', 'probleme');
    fixture.detectChanges();
    type(
      host.querySelector('input[type=email]') as HTMLInputElement,
      'visiteur@exemple.fr',
    );
    choose(
      host.querySelector('select') as HTMLSelectElement,
      ContactProblemLocation.EXAM,
    );
    type(host.querySelector('textarea') as HTMLTextAreaElement, VALID_MESSAGE);
    toggle(host.querySelector('.form__context input') as HTMLInputElement);
    sendButton(host).click();

    expect(submittedDraft().reason).toBe(ContactReason.BUG_REPORT);
    expect(submittedDraft().technicalContext).toBeNull();
  });

  it('préremplit et verrouille l’email du compte, et joint la session du bilan d’origine', async () => {
    const host = await setup({
      authenticated: true,
      queryParams: { motif: 'probleme', session: SESSION_ID },
    });
    fixture.componentRef.setInput('motif', 'probleme');
    fixture.detectChanges();

    const emailInput = host.querySelector(
      'input[type=email]',
    ) as HTMLInputElement;
    expect(emailInput.value).toBe(ACCOUNT_EMAIL);
    expect(emailInput.readOnly).toBe(true);
    expect(host.querySelector('.form__session')?.textContent).toContain(
      'S-D0F0AFCE',
    );

    type(host.querySelector('textarea') as HTMLTextAreaElement, VALID_MESSAGE);
    sendButton(host).click();
    expect(submittedDraft().sessionId).toBe(SESSION_ID);
    expect(submittedDraft().location).toBe(ContactProblemLocation.RESULTS);
  });

  it('ne propose aucune session à un visiteur sans compte', async () => {
    const host = await setup({
      authenticated: false,
      queryParams: { session: SESSION_ID },
    });
    fixture.componentRef.setInput('motif', 'probleme');
    fixture.detectChanges();

    expect(host.querySelector('.form__session')).toBeNull();
    expect(loadHistory).not.toHaveBeenCalled();
  });

  it('affiche la limite d’envoi sans hostilité, amène l’avis à l’écran et conserve le texte', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const host = await setup({ authenticated: false });
    type(host.querySelector('textarea') as HTMLTextAreaElement, VALID_MESSAGE);

    status.set('rate-limited');
    fixture.detectChanges();
    TestBed.tick();

    const notice = host.querySelector('.form__notice') as HTMLElement;
    expect(notice.textContent).toContain('nous lisons chaque message');
    expect(notice.classList.contains('form__notice--error')).toBe(false);
    expect(scrollIntoView).toHaveBeenCalled();
    expect((host.querySelector('textarea') as HTMLTextAreaElement).value).toBe(
      VALID_MESSAGE,
    );
  });

  it('affiche une panne comme une erreur et garde le message saisi', async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const host = await setup({ authenticated: false });
    type(host.querySelector('textarea') as HTMLTextAreaElement, VALID_MESSAGE);

    status.set('failed');
    fixture.detectChanges();

    const notice = host.querySelector('.form__notice') as HTMLElement;
    expect(notice.classList.contains('form__notice--error')).toBe(true);
    expect((host.querySelector('textarea') as HTMLTextAreaElement).value).toBe(
      VALID_MESSAGE,
    );
  });
});
