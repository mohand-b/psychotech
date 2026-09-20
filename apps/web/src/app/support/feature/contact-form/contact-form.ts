import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  model,
  signal,
  viewChild,
} from '@angular/core';
import {
  FormField,
  email,
  form,
  maxLength,
  readonly,
  required,
  validate,
} from '@angular/forms/signals';
import { ActivatedRoute } from '@angular/router';
import {
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_MESSAGE_MIN_LENGTH,
  CONTACT_PAGE_URL_MAX_LENGTH,
  CONTACT_SCREENSHOT_MIME_TYPES,
  CONTACT_SUBJECT_MAX_LENGTH,
  CONTACT_USER_AGENT_MAX_LENGTH,
  ContactProblemLocation,
  ContactReason,
  ContactScreenshotDto,
  ContactSuggestionArea,
  ContactTechnicalContextDto,
  SESSION_MODE_LABELS,
  isSafeReturnUrl,
  problemReasonFor,
} from '@psychotech/shared';
import { Image } from 'lucide-angular';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { SessionHistoryFacade } from '../../../sessions/data-access/session-history.facade';
import { ActionFooter } from '../../../shared/ui/action-footer/action-footer';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { Select, SelectOption } from '../../../shared/ui/select/select';
import {
  CONTACT_ORIGIN_QUERY_PARAM,
  CONTACT_SESSION_QUERY_PARAM,
  ContactMotif,
} from '../../../shared/util/contact-link';
import { encodeScreenshot } from '../../data-access/contact-screenshot';
import {
  ContactFacade,
  ContactSendStatus,
} from '../../data-access/contact.facade';
import {
  CONTACT_AREA_OPTIONS,
  CONTACT_AREA_PLACEHOLDER,
  CONTACT_LOCATION_OPTIONS,
  CONTACT_LOCATION_PLACEHOLDER,
  CONTACT_MOTIFS,
  DEFAULT_CONTACT_MOTIF,
} from '../../ui/contact-presentation';

interface ContactFormModel {
  email: string;
  subject: string;
  area: ContactSuggestionArea | '';
  location: ContactProblemLocation | '';
  message: string;
  attachSession: boolean;
  attachContext: boolean;
  website: string;
}

interface AttachableSession {
  id: string;
  label: string;
  reference: string;
}

interface AttachedScreenshot {
  fileName: string;
  payload: ContactScreenshotDto;
}

const MOBILE_QUERY = '(max-width: 767px)';
const COUNTER_WARNING_MARGIN = 100;
const SESSION_REFERENCE_LENGTH = 8;

interface SendFailure {
  text: string;
  blocking: boolean;
}

const SEND_FAILURES: Partial<Record<ContactSendStatus, SendFailure>> = {
  failed: {
    text: "L'envoi n'a pas abouti. Votre message est conservé ci-dessus : vérifiez votre connexion, puis réessayez.",
    blocking: true,
  },
  'rate-limited': {
    text: 'Vous avez déjà envoyé plusieurs messages récemment. Votre texte est conservé ci-dessus : réessayez dans un moment, nous lisons chaque message.',
    blocking: false,
  },
};
const SESSION_DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

@Component({
  selector: 'app-contact-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ActionFooter, Button, FormField, Icon, Select],
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.css',
})
export class ContactForm {
  private readonly contactFacade = inject(ContactFacade);
  private readonly authFacade = inject(AuthFacade);
  private readonly historyFacade = inject(SessionHistoryFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  readonly motif = model<ContactMotif>(DEFAULT_CONTACT_MOTIF);

  protected readonly imageIcon = Image;
  protected readonly areaOptions = CONTACT_AREA_OPTIONS;
  protected readonly areaPlaceholder = CONTACT_AREA_PLACEHOLDER;
  protected readonly locationPlaceholder = CONTACT_LOCATION_PLACEHOLDER;
  protected readonly screenshotAccept = CONTACT_SCREENSHOT_MIME_TYPES.join(',');

  protected readonly authenticated = this.authFacade.isAuthenticated;
  protected readonly status = this.contactFacade.status;
  protected readonly sending = computed(() => this.status() === 'sending');
  protected readonly sendFailure = computed(() => SEND_FAILURES[this.status()]);
  protected readonly mobile = signal(false);
  private readonly sendNotice =
    viewChild<ElementRef<HTMLElement>>('sendNotice');
  protected readonly screenshot = signal<AttachedScreenshot | null>(null);
  protected readonly screenshotRejected = signal(false);

  private readonly draft = signal<ContactFormModel>({
    email: this.authFacade.currentUser()?.email ?? '',
    subject: '',
    area: '',
    location: this.route.snapshot.queryParamMap.has(CONTACT_SESSION_QUERY_PARAM)
      ? ContactProblemLocation.RESULTS
      : '',
    message: '',
    attachSession: true,
    attachContext: true,
    website: '',
  });

  protected readonly contactForm = form(this.draft, (path) => {
    required(path.email);
    readonly(path.email, () => this.authenticated());
    email(path.email);
    maxLength(path.email, CONTACT_EMAIL_MAX_LENGTH);
    maxLength(path.subject, CONTACT_SUBJECT_MAX_LENGTH);
    maxLength(path.message, CONTACT_MESSAGE_MAX_LENGTH);
    validate(path.message, ({ value }) =>
      value().trim().length < CONTACT_MESSAGE_MIN_LENGTH
        ? { kind: 'messageTooShort' }
        : null,
    );
    validate(path.location, ({ value }) =>
      this.motif() === 'probleme' && value() === ''
        ? { kind: 'locationRequired' }
        : null,
    );
  });

  protected readonly locationOptions = computed<
    SelectOption<ContactProblemLocation>[]
  >(() =>
    CONTACT_LOCATION_OPTIONS.map(({ value, label }) => ({
      value,
      label: this.mobile() ? label.mobile : label.desktop,
    })),
  );
  protected readonly presentation = computed(
    () =>
      CONTACT_MOTIFS.find((motif) => motif.id === this.motif()) ??
      CONTACT_MOTIFS[0],
  );
  protected readonly blocked = computed(
    () => !this.contactForm().valid() || this.sending(),
  );
  protected readonly counter = computed(
    () => `${this.draft().message.length} / ${CONTACT_MESSAGE_MAX_LENGTH}`,
  );
  protected readonly counterWarning = computed(
    () =>
      this.draft().message.length >
      CONTACT_MESSAGE_MAX_LENGTH - COUNTER_WARNING_MARGIN,
  );

  protected readonly attachableSession = computed<AttachableSession | null>(
    () => {
      if (!this.authenticated()) {
        return null;
      }
      const requestedId = this.route.snapshot.queryParamMap.get(
        CONTACT_SESSION_QUERY_PARAM,
      );
      const history = this.historyFacade.items();
      const session = requestedId
        ? history.find((item) => item.id === requestedId)
        : history[0];
      if (!session) {
        return requestedId
          ? {
              id: requestedId,
              label: 'Session du bilan consulté',
              reference: this.sessionReference(requestedId),
            }
          : null;
      }
      return {
        id: session.id,
        label: `${SESSION_MODE_LABELS[session.mode]} du ${SESSION_DATE_FORMAT.format(new Date(session.finishedAt))}`,
        reference: this.sessionReference(session.id),
      };
    },
  );

  constructor() {
    effect(() => {
      const accountEmail = this.authFacade.currentUser()?.email;
      if (accountEmail) {
        this.draft.update((model) => ({ ...model, email: accountEmail }));
      }
    });
    afterRenderEffect(() => {
      this.sendNotice()?.nativeElement.scrollIntoView({ block: 'center' });
    });
    afterNextRender(() => {
      this.contactFacade.prepare();
      this.watchViewport();
      if (this.authenticated() && this.historyFacade.items().length === 0) {
        this.historyFacade.load('ALL');
      }
    });
  }

  protected async onScreenshotPicked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    const payload = await encodeScreenshot(file, this.document);
    this.screenshotRejected.set(payload === null);
    this.screenshot.set(payload ? { fileName: file.name, payload } : null);
  }

  protected removeScreenshot(): void {
    this.screenshot.set(null);
    this.screenshotRejected.set(false);
  }

  protected send(): void {
    if (this.blocked()) {
      return;
    }
    const value = this.draft();
    const motif = this.motif();
    const problem = motif === 'probleme';
    const session = this.attachableSession();
    this.contactFacade.submit({
      reason: this.reasonFor(motif, value.location),
      email: value.email.trim(),
      subject: motif === 'question' ? value.subject.trim() : '',
      area: motif === 'suggestion' && value.area !== '' ? value.area : null,
      location: problem && value.location !== '' ? value.location : null,
      message: value.message.trim(),
      honeypot: value.website,
      technicalContext:
        problem && value.attachContext ? this.collectContext() : null,
      sessionId: problem && value.attachSession && session ? session.id : null,
      screenshot: problem ? (this.screenshot()?.payload ?? null) : null,
    });
  }

  reset(): void {
    this.draft.update((model) => ({
      ...model,
      subject: '',
      area: '',
      location: '',
      message: '',
    }));
    this.removeScreenshot();
  }

  private reasonFor(
    motif: ContactMotif,
    location: ContactProblemLocation | '',
  ): ContactReason {
    if (motif === 'question') {
      return ContactReason.QUESTION;
    }
    if (motif === 'suggestion') {
      return ContactReason.SUGGESTION;
    }
    return location === ''
      ? ContactReason.BUG_REPORT
      : problemReasonFor(location);
  }

  private collectContext(): ContactTechnicalContextDto | null {
    const view = this.document.defaultView;
    if (!view) {
      return null;
    }
    const origin = this.route.snapshot.queryParamMap.get(
      CONTACT_ORIGIN_QUERY_PARAM,
    );
    return {
      pageUrl: (origin && isSafeReturnUrl(origin)
        ? `${view.location.origin}${origin}`
        : view.location.href
      ).slice(0, CONTACT_PAGE_URL_MAX_LENGTH),
      userAgent: view.navigator.userAgent.slice(
        0,
        CONTACT_USER_AGENT_MAX_LENGTH,
      ),
      viewport: `${view.innerWidth}x${view.innerHeight}`,
    };
  }

  private sessionReference(sessionId: string): string {
    return `S-${sessionId.slice(0, SESSION_REFERENCE_LENGTH).toUpperCase()}`;
  }

  private watchViewport(): void {
    const view = this.document.defaultView;
    if (!view || typeof view.matchMedia !== 'function') {
      return;
    }
    const media = view.matchMedia(MOBILE_QUERY);
    const sync = () => this.mobile.set(media.matches);
    sync();
    media.addEventListener('change', sync);
    this.destroyRef.onDestroy(() => media.removeEventListener('change', sync));
  }
}
