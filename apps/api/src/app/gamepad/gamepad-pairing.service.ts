import { randomBytes, randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  GAMEPAD_PAIRING_CODE_LENGTH,
  GAMEPAD_PAIRING_TTL_MS,
  GamepadSignalErrorCode,
} from '@psychotech/shared';

const TOKEN_BYTE_LENGTH = 24;

export interface GamepadPairingRecord {
  token: string;
  code: string;
  sessionId: string;
  userId: string;
  expiresAt: number;
  consumedAt: number | null;
}

export type GamepadPairingClaim =
  | { ok: true; record: GamepadPairingRecord }
  | { ok: false; error: GamepadSignalErrorCode };

@Injectable()
export class GamepadPairingService {
  private readonly recordsByToken = new Map<string, GamepadPairingRecord>();
  private readonly tokensBySession = new Map<string, string>();

  create(
    userId: string,
    sessionId: string,
    now: number = Date.now(),
  ): GamepadPairingRecord {
    this.invalidateForSession(sessionId);
    const record: GamepadPairingRecord = {
      token: randomBytes(TOKEN_BYTE_LENGTH).toString('base64url'),
      code: this.generateCode(),
      sessionId,
      userId,
      expiresAt: now + GAMEPAD_PAIRING_TTL_MS,
      consumedAt: null,
    };
    this.recordsByToken.set(record.token, record);
    this.tokensBySession.set(sessionId, record.token);
    return record;
  }

  claimPhone(
    tokenOrCode: string,
    now: number = Date.now(),
  ): GamepadPairingClaim {
    const record = this.resolve(tokenOrCode);
    if (!record) {
      return { ok: false, error: 'INVALID_TOKEN' };
    }
    if (record.consumedAt !== null) {
      return { ok: true, record };
    }
    if (now > record.expiresAt) {
      this.invalidateForSession(record.sessionId);
      return { ok: false, error: 'TOKEN_EXPIRED' };
    }
    record.consumedAt = now;
    return { ok: true, record };
  }

  validateDesktop(token: string): GamepadPairingClaim {
    const record = this.recordsByToken.get(token);
    if (!record) {
      return { ok: false, error: 'INVALID_TOKEN' };
    }
    return { ok: true, record };
  }

  invalidateForSession(sessionId: string): void {
    const previousToken = this.tokensBySession.get(sessionId);
    if (previousToken) {
      this.recordsByToken.delete(previousToken);
      this.tokensBySession.delete(sessionId);
    }
  }

  private resolve(tokenOrCode: string): GamepadPairingRecord | undefined {
    const byToken = this.recordsByToken.get(tokenOrCode);
    if (byToken) {
      return byToken;
    }
    for (const record of this.recordsByToken.values()) {
      if (record.code === tokenOrCode) {
        return record;
      }
    }
    return undefined;
  }

  private generateCode(): string {
    const max = 10 ** GAMEPAD_PAIRING_CODE_LENGTH;
    return randomInt(0, max)
      .toString()
      .padStart(GAMEPAD_PAIRING_CODE_LENGTH, '0');
  }
}
