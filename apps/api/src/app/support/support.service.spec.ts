import {
  BadRequestException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContactDeliveryStatus, User } from '@prisma/client';
import {
  CONTACT_MIN_FILL_SECONDS,
  CONTACT_TOO_FAST_ERROR_CODE,
  ContactProblemLocation,
  ContactReason,
} from '@psychotech/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IpRateLimitService } from '../auth/ip-rate-limit.service';
import { MailMessage } from '../mail/mailer.port';
import { ContactFormTokenService } from './contact-form-token.service';
import { SubmitContactRequest } from './dto/submit-contact.request';
import { SupportRepository } from './support.repository';
import { SupportService } from './support.service';

const SUPPORT_EMAIL = 'support@psychotech.test';
const FORM_SECRET = 'form-secret';
const ACCOUNT_EMAIL = 'alice@compte.fr';
const IP = '203.0.113.7';
const SESSION_ID = '5f0c5a54-8f0e-4c55-9f65-3f7f6f0f1a11';

const repository = {
  findUser: vi.fn(),
  findOwnedSession: vi.fn(),
  record: vi.fn(),
  markDelivery: vi.fn(),
};
const mailer = { send: vi.fn<(message: MailMessage) => Promise<void>>() };
const configService = {
  getOrThrow: () => ({ appBaseUrl: 'https://psychotech.test' }),
} as unknown as ConfigService;

const formTokens = new ContactFormTokenService({
  supportEmail: SUPPORT_EMAIL,
  formTokenSecret: FORM_SECRET,
});

function buildService(
  options: { supportEmail?: string } = { supportEmail: SUPPORT_EMAIL },
) {
  return new SupportService(
    repository as unknown as SupportRepository,
    formTokens,
    new IpRateLimitService(),
    mailer,
    { supportEmail: options.supportEmail, formTokenSecret: FORM_SECRET },
    configService,
  );
}

function pacedToken(): string {
  return formTokens.issue(
    new Date(Date.now() - (CONTACT_MIN_FILL_SECONDS + 1) * 1000),
  );
}

function buildRequest(
  overrides: Partial<SubmitContactRequest> = {},
): SubmitContactRequest {
  return Object.assign(new SubmitContactRequest(), {
    reason: ContactReason.QUESTION,
    email: 'visiteur@exemple.fr',
    message: 'Comment fonctionnent les crédits offerts ?',
    formToken: pacedToken(),
    ...overrides,
  });
}

function sentTo(address: string): MailMessage | undefined {
  return mailer.send.mock.calls
    .map(([message]) => message)
    .find((message) => message.to === address);
}

beforeEach(() => {
  vi.clearAllMocks();
  mailer.send.mockResolvedValue(undefined);
  repository.record.mockResolvedValue({ id: 'submission-1', number: 42 });
  repository.markDelivery.mockResolvedValue(undefined);
});

describe('SupportService.submit', () => {
  it('stores the message, relays it to support with a reply-to and acknowledges the sender', async () => {
    const receipt = await buildService().submit(buildRequest(), {
      ip: IP,
      userId: null,
    });

    expect(receipt).toEqual({
      reference: 'C-00042',
      email: 'visiteur@exemple.fr',
    });
    expect(repository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: ContactReason.QUESTION,
        email: 'visiteur@exemple.fr',
        userId: null,
        context: null,
        sessionId: null,
      }),
    );
    expect(sentTo(SUPPORT_EMAIL)?.replyTo).toBe('visiteur@exemple.fr');
    expect(sentTo(SUPPORT_EMAIL)?.subject).toContain('C-00042');
    expect(sentTo('visiteur@exemple.fr')?.subject).toContain('C-00042');
    expect(repository.markDelivery).toHaveBeenCalledWith('submission-1', {
      supportStatus: ContactDeliveryStatus.SENT,
      acknowledgementStatus: ContactDeliveryStatus.SENT,
    });
  });

  it('answers a filled honeypot with a silent success: nothing stored, nothing sent', async () => {
    const receipt = await buildService().submit(
      buildRequest({ website: 'https://spam.example' }),
      { ip: IP, userId: null },
    );

    expect(receipt.reference).toMatch(/^C-\d{5}$/);
    expect(receipt.email).toBe('visiteur@exemple.fr');
    expect(repository.record).not.toHaveBeenCalled();
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('rejects a form submitted faster than a human could fill it', async () => {
    const submission = buildService().submit(
      buildRequest({ formToken: formTokens.issue() }),
      { ip: IP, userId: null },
    );

    await expect(submission).rejects.toThrow(CONTACT_TOO_FAST_ERROR_CODE);
    expect(repository.record).not.toHaveBeenCalled();
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('rejects a forged form token', async () => {
    const [issuedAt] = pacedToken().split('.');

    await expect(
      buildService().submit(
        buildRequest({ formToken: `${issuedAt}.${'0'.repeat(64)}` }),
        { ip: IP, userId: null },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rate limits by email address, whatever the ip', async () => {
    const service = buildService();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await service.submit(buildRequest(), {
        ip: `198.51.100.${attempt}`,
        userId: null,
      });
    }

    const blocked = service.submit(buildRequest(), {
      ip: '198.51.100.99',
      userId: null,
    });

    await expect(blocked).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HttpException &&
        error.getStatus() === HttpStatus.TOO_MANY_REQUESTS,
    );
    expect(repository.record).toHaveBeenCalledTimes(3);
  });

  it('rate limits by ip, whatever the email address', async () => {
    const service = buildService();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await service.submit(
        buildRequest({ email: `visiteur${attempt}@exemple.fr` }),
        { ip: IP, userId: null },
      );
    }

    await expect(
      service.submit(buildRequest({ email: 'autre@exemple.fr' }), {
        ip: IP,
        userId: null,
      }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HttpException &&
        error.getStatus() === HttpStatus.TOO_MANY_REQUESTS,
    );
  });

  it('keeps the stored message and still answers a success when the mailer fails', async () => {
    mailer.send.mockRejectedValue(new Error('resend down'));

    const receipt = await buildService().submit(buildRequest(), {
      ip: IP,
      userId: null,
    });

    expect(receipt.reference).toBe('C-00042');
    expect(repository.record).toHaveBeenCalledTimes(1);
    expect(repository.markDelivery).toHaveBeenCalledWith('submission-1', {
      supportStatus: ContactDeliveryStatus.FAILED,
      acknowledgementStatus: ContactDeliveryStatus.FAILED,
    });
  });

  it('still succeeds when only the database is down, since support received the message', async () => {
    repository.record.mockRejectedValue(new Error('database down'));

    const receipt = await buildService().submit(buildRequest(), {
      ip: IP,
      userId: null,
    });

    expect(receipt.reference).toMatch(/^C-\d{5}$/);
    expect(sentTo(SUPPORT_EMAIL)).toBeDefined();
  });

  it('fails only when the message could be neither stored nor relayed', async () => {
    repository.record.mockRejectedValue(new Error('database down'));
    mailer.send.mockRejectedValue(new Error('resend down'));

    await expect(
      buildService().submit(buildRequest(), { ip: IP, userId: null }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('stores the message as pending when no support address is configured', async () => {
    await buildService({}).submit(buildRequest(), {
      ip: IP,
      userId: null,
    });

    expect(mailer.send).toHaveBeenCalledTimes(1);
    expect(repository.markDelivery).toHaveBeenCalledWith('submission-1', {
      supportStatus: ContactDeliveryStatus.PENDING,
      acknowledgementStatus: ContactDeliveryStatus.SENT,
    });
  });

  it('carries no technical context when the visitor left the box unchecked', async () => {
    await buildService().submit(
      buildRequest({
        reason: ContactReason.BUG_REPORT,
        location: ContactProblemLocation.EXAM,
      }),
      { ip: IP, userId: null },
    );

    expect(repository.record).toHaveBeenCalledWith(
      expect.objectContaining({ context: null }),
    );
    const relayed = sentTo(SUPPORT_EMAIL);
    expect(relayed?.text).not.toContain('Navigateur');
    expect(relayed?.text).not.toContain('Page :');
    expect(relayed?.text).not.toContain(IP);
  });

  it('relays the technical context only as the visitor provided it', async () => {
    const technicalContext = {
      pageUrl: 'https://psychotechtraining.com/sessions/abc/resultat',
      userAgent: 'Mozilla/5.0 (Linux; Android 10)',
      viewport: '390x844',
    };
    await buildService().submit(
      buildRequest({
        reason: ContactReason.BUG_REPORT,
        location: ContactProblemLocation.RESULTS,
        technicalContext,
      }),
      { ip: IP, userId: null },
    );

    expect(repository.record).toHaveBeenCalledWith(
      expect.objectContaining({ context: technicalContext }),
    );
    expect(sentTo(SUPPORT_EMAIL)?.text).toContain('390x844');
  });

  it('leaves the page out of the relay when the visitor came with no origin page', async () => {
    await buildService().submit(
      buildRequest({
        reason: ContactReason.BUG_REPORT,
        location: ContactProblemLocation.ACCOUNT,
        technicalContext: {
          userAgent: 'Mozilla/5.0 (Linux; Android 10)',
          viewport: '390x844',
        },
      }),
      { ip: IP, userId: null },
    );

    const relayed = sentTo(SUPPORT_EMAIL);
    expect(relayed?.text).toContain('390x844');
    expect(relayed?.text).not.toContain('Page :');
  });

  it('files a problem located in credits or payment as a payment issue', async () => {
    await buildService().submit(
      buildRequest({
        reason: ContactReason.BUG_REPORT,
        location: ContactProblemLocation.CREDITS_OR_PAYMENT,
      }),
      { ip: IP, userId: null },
    );

    expect(repository.record).toHaveBeenCalledWith(
      expect.objectContaining({ reason: ContactReason.PAYMENT_ISSUE }),
    );
    expect(sentTo(SUPPORT_EMAIL)?.subject).toContain('Problème de paiement');
  });

  it('refuses a problem report without a location', async () => {
    await expect(
      buildService().submit(
        buildRequest({ reason: ContactReason.BUG_REPORT }),
        { ip: IP, userId: null },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires an email address from a visitor without an account', async () => {
    await expect(
      buildService().submit(buildRequest({ email: undefined }), {
        ip: IP,
        userId: null,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('never attaches a session to a visitor without an account', async () => {
    await buildService().submit(buildRequest({ sessionId: SESSION_ID }), {
      ip: IP,
      userId: null,
    });

    expect(repository.findOwnedSession).not.toHaveBeenCalled();
    expect(repository.record).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: null }),
    );
  });

  describe('from a signed-in account', () => {
    const account = {
      id: 'user-1',
      email: ACCOUNT_EMAIL,
      firstName: 'Alice',
      lastName: 'Martin',
    } as User;

    beforeEach(() => {
      repository.findUser.mockResolvedValue(account);
    });

    it('uses the account email and id, whatever email the client sends', async () => {
      const receipt = await buildService().submit(
        buildRequest({ email: 'usurpe@exemple.fr' }),
        { ip: IP, userId: 'user-1' },
      );

      expect(receipt.email).toBe(ACCOUNT_EMAIL);
      expect(repository.record).toHaveBeenCalledWith(
        expect.objectContaining({ email: ACCOUNT_EMAIL, userId: 'user-1' }),
      );
      expect(sentTo(SUPPORT_EMAIL)?.replyTo).toBe(ACCOUNT_EMAIL);
      expect(sentTo(SUPPORT_EMAIL)?.text).not.toContain('usurpe@exemple.fr');
      expect(sentTo('usurpe@exemple.fr')).toBeUndefined();
      expect(sentTo(ACCOUNT_EMAIL)?.text).toContain('Bonjour Alice,');
    });

    it('attaches the session only when it belongs to the account, without any score', async () => {
      repository.findOwnedSession.mockResolvedValue({
        id: SESSION_ID,
        mode: 'FULL',
        startedAt: new Date('2026-09-18T07:12:00Z'),
        globalScore: 71.5,
      });

      await buildService().submit(
        buildRequest({
          reason: ContactReason.BUG_REPORT,
          location: ContactProblemLocation.RESULTS,
          sessionId: SESSION_ID,
        }),
        { ip: IP, userId: 'user-1' },
      );

      expect(repository.findOwnedSession).toHaveBeenCalledWith(
        SESSION_ID,
        'user-1',
      );
      const relayed = sentTo(SUPPORT_EMAIL);
      expect(relayed?.text).toContain(SESSION_ID);
      expect(relayed?.text).toContain('Examen blanc');
      expect(relayed?.text).not.toContain('71');
    });

    it('drops a session that belongs to someone else', async () => {
      repository.findOwnedSession.mockResolvedValue(null);

      await buildService().submit(buildRequest({ sessionId: SESSION_ID }), {
        ip: IP,
        userId: 'user-1',
      });

      expect(repository.record).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: null }),
      );
      expect(sentTo(SUPPORT_EMAIL)?.text).not.toContain(SESSION_ID);
    });
  });

  describe('screenshot', () => {
    const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const problem = {
      reason: ContactReason.BUG_REPORT,
      location: ContactProblemLocation.EXAM,
    };

    it('attaches a genuine image to the support email only', async () => {
      await buildService().submit(
        buildRequest({
          ...problem,
          screenshot: {
            mimeType: 'image/png',
            dataBase64: Buffer.from(PNG_HEADER).toString('base64'),
          },
        }),
        { ip: IP, userId: null },
      );

      expect(sentTo(SUPPORT_EMAIL)?.attachments).toEqual([
        expect.objectContaining({
          filename: 'capture.png',
          contentType: 'image/png',
        }),
      ]);
      expect(sentTo('visiteur@exemple.fr')?.attachments).toBeUndefined();
      expect(repository.record).toHaveBeenCalledWith(
        expect.objectContaining({ hasScreenshot: true }),
      );
    });

    it('refuses a file that only pretends to be an image', async () => {
      await expect(
        buildService().submit(
          buildRequest({
            ...problem,
            screenshot: {
              mimeType: 'image/png',
              dataBase64: Buffer.from('<script>').toString('base64'),
            },
          }),
          { ip: IP, userId: null },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
