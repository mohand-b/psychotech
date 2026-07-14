import { GAMEPAD_PAIRING_TTL_MS } from '@psychotech/shared';
import { GamepadPairingService } from './gamepad-pairing.service';

describe('GamepadPairingService', () => {
  const userId = 'user-1';
  const sessionId = 'session-1';
  let service: GamepadPairingService;

  beforeEach(() => {
    service = new GamepadPairingService();
  });

  it('creates a token with a six digit code and the configured ttl', () => {
    const now = 1_000_000;
    const record = service.create(userId, sessionId, now);
    expect(record.token.length).toBeGreaterThanOrEqual(24);
    expect(record.code).toMatch(/^\d{6}$/);
    expect(record.expiresAt).toBe(now + GAMEPAD_PAIRING_TTL_MS);
    expect(record.consumedAt).toBeNull();
  });

  it('lets the phone claim a valid token once and keeps it claimable for reconnection', () => {
    const now = 1_000_000;
    const record = service.create(userId, sessionId, now);
    const first = service.claimPhone(record.token, now + 1000);
    expect(first).toEqual({
      ok: true,
      record: expect.objectContaining({ consumedAt: now + 1000 }),
    });
    const reconnect = service.claimPhone(record.token, now + 5000);
    expect(reconnect.ok).toBe(true);
  });

  it('resolves the six digit code as an equivalent of the token', () => {
    const record = service.create(userId, sessionId, 1_000_000);
    const claim = service.claimPhone(record.code, 1_001_000);
    expect(claim).toEqual({
      ok: true,
      record: expect.objectContaining({ token: record.token }),
    });
  });

  it('rejects an unknown token', () => {
    expect(service.claimPhone('unknown', 0)).toEqual({
      ok: false,
      error: 'INVALID_TOKEN',
    });
  });

  it('rejects and invalidates an expired unconsumed token', () => {
    const now = 1_000_000;
    const record = service.create(userId, sessionId, now);
    const expired = service.claimPhone(
      record.token,
      now + GAMEPAD_PAIRING_TTL_MS + 1,
    );
    expect(expired).toEqual({ ok: false, error: 'TOKEN_EXPIRED' });
    expect(service.claimPhone(record.token, now)).toEqual({
      ok: false,
      error: 'INVALID_TOKEN',
    });
  });

  it('invalidates the previous token when regenerating for the same session', () => {
    const first = service.create(userId, sessionId, 1_000_000);
    const second = service.create(userId, sessionId, 1_010_000);
    expect(second.token).not.toBe(first.token);
    expect(service.claimPhone(first.token, 1_011_000)).toEqual({
      ok: false,
      error: 'INVALID_TOKEN',
    });
    expect(service.claimPhone(second.token, 1_011_000).ok).toBe(true);
  });

  it('validates the desktop with the exact token without consuming it', () => {
    const record = service.create(userId, sessionId, 1_000_000);
    const validation = service.validateDesktop(record.token);
    expect(validation).toEqual({
      ok: true,
      record: expect.objectContaining({ consumedAt: null }),
    });
    expect(service.validateDesktop('unknown')).toEqual({
      ok: false,
      error: 'INVALID_TOKEN',
    });
  });
});
