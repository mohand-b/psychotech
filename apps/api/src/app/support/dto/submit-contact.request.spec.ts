import {
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_SUBJECT_MAX_LENGTH,
  ContactReason,
} from '@psychotech/shared';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { SubmitContactRequest } from './submit-contact.request';

const VALID = {
  reason: ContactReason.QUESTION,
  email: 'visiteur@exemple.fr',
  message: 'Comment fonctionnent les crédits offerts ?',
  formToken: '1789000000000.abcdef',
};

async function failingFields(payload: object): Promise<string[]> {
  const errors = await validate(plainToInstance(SubmitContactRequest, payload));
  return errors.map((error) => error.property);
}

describe('SubmitContactRequest', () => {
  it('accepts a minimal valid message and normalises the email', async () => {
    const request = plainToInstance(SubmitContactRequest, {
      ...VALID,
      email: '  Visiteur@Exemple.FR ',
    });

    expect(await validate(request)).toHaveLength(0);
    expect(request.email).toBe('visiteur@exemple.fr');
  });

  it.each([
    'visiteur',
    'visiteur@',
    'visiteur@exemple',
    'vi siteur@exemple.fr',
    `${'a'.repeat(250)}@exemple.fr`,
  ])('rejects the malformed email %j', async (email) => {
    expect(await failingFields({ ...VALID, email })).toContain('email');
  });

  it.each([
    ['too short', 'Bonjour'],
    ['only spaces', ' '.repeat(40)],
    ['too long', 'a'.repeat(CONTACT_MESSAGE_MAX_LENGTH + 1)],
  ])('rejects a message that is %s', async (_label, message) => {
    expect(await failingFields({ ...VALID, message })).toContain('message');
  });

  it('rejects an unknown reason, an oversized subject and a missing form token', async () => {
    const fields = await failingFields({
      ...VALID,
      reason: 'SPAM',
      subject: 'a'.repeat(CONTACT_SUBJECT_MAX_LENGTH + 1),
      formToken: undefined,
    });

    expect(fields).toEqual(
      expect.arrayContaining(['reason', 'subject', 'formToken']),
    );
  });

  it('accepts a technical context that carries no origin page', async () => {
    const fields = await failingFields({
      ...VALID,
      technicalContext: { userAgent: 'Mozilla/5.0', viewport: '390x844' },
    });

    expect(fields).toEqual([]);
  });

  it('rejects a technical context with a fanciful viewport or an endless page url', async () => {
    const fields = await failingFields({
      ...VALID,
      technicalContext: {
        pageUrl: `https://psychotechtraining.com/${'a'.repeat(400)}`,
        userAgent: 'Mozilla/5.0',
        viewport: 'large',
      },
    });

    expect(fields).toContain('technicalContext');
  });

  it('rejects a screenshot of an unsupported type or a session id that is not a uuid', async () => {
    const fields = await failingFields({
      ...VALID,
      sessionId: 'S-48213',
      screenshot: { mimeType: 'image/svg+xml', dataBase64: 'AAAA' },
    });

    expect(fields).toEqual(expect.arrayContaining(['sessionId', 'screenshot']));
  });
});
