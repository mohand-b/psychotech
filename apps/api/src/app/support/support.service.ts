import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService, ConfigType } from '@nestjs/config';
import { ContactDeliveryStatus, Session, User } from '@prisma/client';
import {
  ContactProblemLocation,
  ContactReason,
  ContactReceiptDto,
  ContactScreenshotMimeType,
  ContactSuggestionArea,
  SESSION_MODE_LABELS,
  SessionMode,
  isProblemReason,
  problemReasonFor,
} from '@psychotech/shared';
import { IpRateLimitService } from '../auth/ip-rate-limit.service';
import { mapEnumValue } from '../common/enum.util';
import { MailConfig } from '../config/mail.config';
import { supportConfig } from '../config/support.config';
import {
  ContactFact,
  buildContactAcknowledgementEmail,
  buildContactSupportEmail,
} from '../mail/mail-templates';
import { MAILER, MailAttachment, MailerPort } from '../mail/mailer.port';
import { ContactFormTokenService } from './contact-form-token.service';
import { SubmitContactRequest } from './dto/submit-contact.request';
import { SupportRepository } from './support.repository';

const CONTACT_IP_LIMIT = { limit: 5, windowMs: 3_600_000 };
const CONTACT_EMAIL_LIMIT = { limit: 3, windowMs: 3_600_000 };
const REFERENCE_PREFIX = 'C-';
const REFERENCE_DIGITS = 5;
const REFERENCE_MODULUS = 10 ** REFERENCE_DIGITS;
const DEFAULT_BASE_URL = 'http://localhost:4200';
const SESSION_DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Europe/Paris',
});

const REASON_LABELS: Record<ContactReason, string> = {
  [ContactReason.QUESTION]: 'Question',
  [ContactReason.SUGGESTION]: 'Suggestion',
  [ContactReason.BUG_REPORT]: 'Signalement de bug',
  [ContactReason.PAYMENT_ISSUE]: 'Problème de paiement',
};

const AREA_LABELS: Record<ContactSuggestionArea, string> = {
  [ContactSuggestionArea.EXERCISE]: 'Une épreuve',
  [ContactSuggestionArea.RESULTS]: 'Bilans et résultats',
  [ContactSuggestionArea.BADGES]: 'Badges',
  [ContactSuggestionArea.CREDITS]: 'Crédits',
  [ContactSuggestionArea.OTHER]: 'Autre',
};

const LOCATION_LABELS: Record<ContactProblemLocation, string> = {
  [ContactProblemLocation.EXAM]: 'Examen blanc',
  [ContactProblemLocation.TARGETED_SESSION]: 'Session ciblée',
  [ContactProblemLocation.RESULTS]: 'Bilan ou résultat',
  [ContactProblemLocation.CREDITS_OR_PAYMENT]: 'Crédits ou paiement',
  [ContactProblemLocation.ACCOUNT]: 'Compte, connexion, email',
  [ContactProblemLocation.ELSEWHERE]: 'Ailleurs',
};

const SCREENSHOT_SIGNATURES: Record<ContactScreenshotMimeType, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
};

const SCREENSHOT_EXTENSIONS: Record<ContactScreenshotMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface ContactOrigin {
  ip: string;
  userId: string | null;
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly repository: SupportRepository,
    private readonly formTokens: ContactFormTokenService,
    private readonly rateLimit: IpRateLimitService,
    @Inject(MAILER) private readonly mailer: MailerPort,
    @Inject(supportConfig.KEY)
    private readonly config: ConfigType<typeof supportConfig>,
    configService: ConfigService,
  ) {
    this.baseUrl =
      configService.getOrThrow<MailConfig>('mail').appBaseUrl ??
      DEFAULT_BASE_URL;
    if (!this.config.supportEmail) {
      this.logger.warn(
        'SUPPORT_EMAIL is not set: contact messages are stored but not relayed',
      );
    }
  }

  issueFormToken(): string {
    return this.formTokens.issue();
  }

  async submit(
    request: SubmitContactRequest,
    origin: ContactOrigin,
  ): Promise<ContactReceiptDto> {
    const user = await this.resolveUser(origin.userId);
    const email = user?.email ?? request.email;
    if (!email) {
      throw new BadRequestException('An email address is required');
    }
    if (request.website) {
      return { reference: this.unrecordedReference(), email };
    }
    this.rateLimit.assertAllowed(`contact:ip:${origin.ip}`, CONTACT_IP_LIMIT);
    this.formTokens.assertHumanPaced(request.formToken);
    this.rateLimit.assertAllowed(`contact:email:${email}`, CONTACT_EMAIL_LIMIT);

    const reason = this.resolveReason(request);
    const screenshot = this.decodeScreenshot(request);
    const session =
      user && request.sessionId
        ? await this.repository.findOwnedSession(request.sessionId, user.id)
        : null;

    const submission = await this.record(request, {
      reason,
      email,
      user,
      session,
      hasScreenshot: screenshot !== null,
    });
    const reference = submission
      ? this.formatReference(submission.number)
      : this.unrecordedReference();
    const facts = this.buildFacts(request, { email, user, session });
    const supportStatus = await this.relayToSupport({
      reference,
      reason,
      email,
      facts,
      message: request.message,
      screenshot,
    });
    const acknowledgementStatus = await this.acknowledge({
      reference,
      reason,
      email,
      firstName: user?.firstName ?? null,
      message: request.message,
    });
    if (!submission && supportStatus !== ContactDeliveryStatus.SENT) {
      throw new ServiceUnavailableException(
        'The message could be neither stored nor relayed',
      );
    }
    if (submission) {
      await this.markDelivery(submission.id, {
        supportStatus,
        acknowledgementStatus,
      });
    }
    return { reference, email };
  }

  private async resolveUser(userId: string | null): Promise<User | null> {
    if (!userId) {
      return null;
    }
    const user = await this.repository.findUser(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

  private resolveReason(request: SubmitContactRequest): ContactReason {
    if (!isProblemReason(request.reason)) {
      return request.reason;
    }
    if (!request.location) {
      throw new BadRequestException('A problem report requires a location');
    }
    return problemReasonFor(request.location);
  }

  private decodeScreenshot(
    request: SubmitContactRequest,
  ): MailAttachment | null {
    const screenshot = request.screenshot;
    if (!screenshot || !isProblemReason(request.reason)) {
      return null;
    }
    const content = Buffer.from(screenshot.dataBase64, 'base64');
    const signature = SCREENSHOT_SIGNATURES[screenshot.mimeType];
    if (!signature.every((byte, index) => content[index] === byte)) {
      throw new BadRequestException('The screenshot is not a valid image');
    }
    return {
      filename: `capture.${SCREENSHOT_EXTENSIONS[screenshot.mimeType]}`,
      contentType: screenshot.mimeType,
      content,
    };
  }

  private async record(
    request: SubmitContactRequest,
    resolved: {
      reason: ContactReason;
      email: string;
      user: User | null;
      session: Session | null;
      hasScreenshot: boolean;
    },
  ) {
    try {
      return await this.repository.record({
        reason: resolved.reason,
        email: resolved.email,
        userId: resolved.user?.id ?? null,
        subject: request.subject || null,
        area: request.area ?? null,
        location: request.location ?? null,
        message: request.message,
        context: request.technicalContext
          ? { ...request.technicalContext }
          : null,
        sessionId: resolved.session?.id ?? null,
        hasScreenshot: resolved.hasScreenshot,
      });
    } catch (error) {
      this.logger.error('Contact submission could not be stored', error);
      return null;
    }
  }

  private buildFacts(
    request: SubmitContactRequest,
    resolved: { email: string; user: User | null; session: Session | null },
  ): ContactFact[] {
    const facts: ContactFact[] = [
      { label: 'Expéditeur', value: resolved.email },
      {
        label: 'Compte',
        value: resolved.user
          ? `${resolved.user.firstName} ${resolved.user.lastName} · ${resolved.user.id}`
          : 'Sans compte',
      },
    ];
    if (request.subject) {
      facts.push({ label: 'Sujet', value: request.subject });
    }
    if (request.area) {
      facts.push({
        label: 'Partie concernée',
        value: AREA_LABELS[request.area],
      });
    }
    if (request.location) {
      facts.push({ label: 'Où', value: LOCATION_LABELS[request.location] });
    }
    if (resolved.session) {
      facts.push({
        label: 'Session jointe',
        value: `${SESSION_MODE_LABELS[mapEnumValue(SessionMode, resolved.session.mode)]} du ${SESSION_DATE_FORMAT.format(resolved.session.startedAt)} · ${resolved.session.id}`,
      });
    }
    if (request.technicalContext) {
      facts.push(
        { label: 'Page', value: request.technicalContext.pageUrl },
        { label: 'Navigateur', value: request.technicalContext.userAgent },
        { label: 'Écran', value: request.technicalContext.viewport },
      );
    }
    return facts;
  }

  private async relayToSupport(input: {
    reference: string;
    reason: ContactReason;
    email: string;
    facts: ContactFact[];
    message: string;
    screenshot: MailAttachment | null;
  }): Promise<ContactDeliveryStatus> {
    if (!this.config.supportEmail) {
      return ContactDeliveryStatus.PENDING;
    }
    return this.deliver(() =>
      this.mailer.send({
        to: this.config.supportEmail as string,
        replyTo: input.email,
        attachments: input.screenshot ? [input.screenshot] : undefined,
        ...buildContactSupportEmail({
          reference: input.reference,
          reasonLabel: REASON_LABELS[input.reason],
          facts: input.facts,
          message: input.message,
          baseUrl: this.baseUrl,
        }),
      }),
    );
  }

  private acknowledge(input: {
    reference: string;
    reason: ContactReason;
    email: string;
    firstName: string | null;
    message: string;
  }): Promise<ContactDeliveryStatus> {
    return this.deliver(() =>
      this.mailer.send({
        to: input.email,
        ...buildContactAcknowledgementEmail({
          firstName: input.firstName,
          reference: input.reference,
          reasonLabel: REASON_LABELS[input.reason],
          message: input.message,
          baseUrl: this.baseUrl,
        }),
      }),
    );
  }

  private async deliver(
    send: () => Promise<void>,
  ): Promise<ContactDeliveryStatus> {
    try {
      await send();
      return ContactDeliveryStatus.SENT;
    } catch (error) {
      this.logger.error('Contact email could not be sent', error);
      return ContactDeliveryStatus.FAILED;
    }
  }

  private async markDelivery(
    submissionId: string,
    outcome: {
      supportStatus: ContactDeliveryStatus;
      acknowledgementStatus: ContactDeliveryStatus;
    },
  ): Promise<void> {
    try {
      await this.repository.markDelivery(submissionId, outcome);
    } catch (error) {
      this.logger.error('Contact delivery status could not be stored', error);
    }
  }

  private formatReference(number: number): string {
    return `${REFERENCE_PREFIX}${String(number).padStart(REFERENCE_DIGITS, '0')}`;
  }

  private unrecordedReference(): string {
    return this.formatReference(Date.now() % REFERENCE_MODULUS);
  }
}
