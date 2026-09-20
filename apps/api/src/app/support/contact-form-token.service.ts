import { createHmac, timingSafeEqual } from 'node:crypto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import {
  CONTACT_FORM_EXPIRED_ERROR_CODE,
  CONTACT_FORM_TOKEN_TTL_HOURS,
  CONTACT_MIN_FILL_SECONDS,
  CONTACT_TOO_FAST_ERROR_CODE,
} from '@psychotech/shared';
import { supportConfig } from '../config/support.config';

const TOKEN_SEPARATOR = '.';
const SIGNATURE_CONTEXT = 'contact-form';
const MILLISECONDS_PER_SECOND = 1000;
const MILLISECONDS_PER_HOUR = 3_600_000;

@Injectable()
export class ContactFormTokenService {
  constructor(
    @Inject(supportConfig.KEY)
    private readonly config: ConfigType<typeof supportConfig>,
  ) {}

  issue(now = new Date()): string {
    const issuedAt = String(now.getTime());
    return `${issuedAt}${TOKEN_SEPARATOR}${this.sign(issuedAt)}`;
  }

  assertHumanPaced(token: string, now = new Date()): void {
    const [issuedAt, signature, ...rest] = token.split(TOKEN_SEPARATOR);
    if (
      !issuedAt ||
      !signature ||
      rest.length > 0 ||
      !/^\d+$/.test(issuedAt) ||
      !this.matches(signature, this.sign(issuedAt))
    ) {
      throw new BadRequestException(CONTACT_FORM_EXPIRED_ERROR_CODE);
    }
    const ageMs = now.getTime() - Number(issuedAt);
    if (ageMs > CONTACT_FORM_TOKEN_TTL_HOURS * MILLISECONDS_PER_HOUR) {
      throw new BadRequestException(CONTACT_FORM_EXPIRED_ERROR_CODE);
    }
    if (ageMs < CONTACT_MIN_FILL_SECONDS * MILLISECONDS_PER_SECOND) {
      throw new BadRequestException(CONTACT_TOO_FAST_ERROR_CODE);
    }
  }

  private sign(issuedAt: string): string {
    return createHmac('sha256', this.config.formTokenSecret)
      .update(`${SIGNATURE_CONTEXT}:${issuedAt}`)
      .digest('hex');
  }

  private matches(presented: string, expected: string): boolean {
    const presentedBytes = Buffer.from(presented);
    const expectedBytes = Buffer.from(expected);
    return (
      presentedBytes.length === expectedBytes.length &&
      timingSafeEqual(presentedBytes, expectedBytes)
    );
  }
}
