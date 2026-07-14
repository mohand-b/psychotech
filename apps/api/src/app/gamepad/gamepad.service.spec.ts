import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GamepadPairingService } from './gamepad-pairing.service';
import { PairingSession } from './gamepad.repository';
import { GamepadService } from './gamepad.service';

function buildSession(overrides: Partial<PairingSession> = {}): PairingSession {
  return {
    id: 'session-1',
    userId: 'user-1',
    mode: 'TARGETED',
    sector: 'RAILWAY',
    status: 'IN_PROGRESS',
    seed: 'seed',
    helpEnabled: false,
    trainingOptions: [],
    energyCost: 1,
    currentAxisIndex: 0,
    globalScore: null,
    globalBand: null,
    isAdmissible: null,
    isEliminated: null,
    sectorThreshold: 70,
    startedAt: new Date('2026-07-09T10:00:00Z'),
    completedAt: null,
    abandonedAt: null,
    controlModality: null,
    axisResults: [
      {
        id: 'axis-1',
        sessionId: 'session-1',
        axis: 'MOTOR_SKILLS',
        order: 0,
        normalizedScore: null,
        band: null,
        skipped: false,
        startedAt: null,
        completedAt: null,
        metrics: null,
      },
    ],
    ...overrides,
  } as PairingSession;
}

describe('GamepadService.createPairing', () => {
  const repository = { findUserSession: vi.fn() };
  let service: GamepadService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GamepadService(
      repository as never,
      new GamepadPairingService(),
    );
  });

  it('returns a token, an equivalent code and an expiry for a motricity session', async () => {
    repository.findUserSession.mockResolvedValue(buildSession());
    const pairing = await service.createPairing('user-1', 'session-1');
    expect(pairing.token.length).toBeGreaterThanOrEqual(24);
    expect(pairing.code).toMatch(/^\d{6}$/);
    expect(Date.parse(pairing.expiresAt)).toBeGreaterThan(Date.now());
  });

  it('rejects an unknown session', async () => {
    repository.findUserSession.mockResolvedValue(null);
    await expect(
      service.createPairing('user-1', 'session-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a session that is not in progress', async () => {
    repository.findUserSession.mockResolvedValue(
      buildSession({ status: 'COMPLETED' }),
    );
    await expect(
      service.createPairing('user-1', 'session-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('pairs a full simulation whose current axis is motricity', async () => {
    repository.findUserSession.mockResolvedValue(
      buildSession({
        mode: 'FULL',
        energyCost: 5,
        currentAxisIndex: 4,
        axisResults: (
          [
            'LOGIC',
            'MEMORY',
            'VISUAL_DISCRIMINATION',
            'REACTIVITY',
            'MOTOR_SKILLS',
          ] as const
        ).map((axis, order) => ({
          id: `axis-${order + 1}`,
          sessionId: 'session-1',
          axis,
          order,
          normalizedScore: null,
          band: null,
          skipped: false,
          startedAt: null,
          completedAt: order < 4 ? new Date('2026-07-11T10:05:00Z') : null,
          metrics: null,
        })),
      } as Partial<PairingSession>),
    );
    const pairing = await service.createPairing('user-1', 'session-1');
    expect(pairing.code).toMatch(/^\d{6}$/);
  });

  it('rejects a full simulation whose current axis is not motricity', async () => {
    repository.findUserSession.mockResolvedValue(
      buildSession({
        mode: 'FULL',
        energyCost: 5,
        currentAxisIndex: 0,
        axisResults: (
          [
            'LOGIC',
            'MEMORY',
            'VISUAL_DISCRIMINATION',
            'REACTIVITY',
            'MOTOR_SKILLS',
          ] as const
        ).map((axis, order) => ({
          id: `axis-${order + 1}`,
          sessionId: 'session-1',
          axis,
          order,
          normalizedScore: null,
          band: null,
          skipped: false,
          startedAt: null,
          completedAt: null,
          metrics: null,
        })),
      } as Partial<PairingSession>),
    );
    await expect(
      service.createPairing('user-1', 'session-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a session that is not a targeted motricity session', async () => {
    repository.findUserSession.mockResolvedValue(
      buildSession({
        axisResults: [
          {
            id: 'axis-1',
            sessionId: 'session-1',
            axis: 'LOGIC',
            order: 0,
            normalizedScore: null,
            band: null,
            skipped: false,
            startedAt: null,
            completedAt: null,
            metrics: null,
          },
        ],
      } as Partial<PairingSession>),
    );
    await expect(
      service.createPairing('user-1', 'session-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('GamepadService.createTutorialPairing', () => {
  const repository = { findUserSession: vi.fn() };
  let service: GamepadService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GamepadService(
      repository as never,
      new GamepadPairingService(),
    );
  });

  it('returns a pairing without looking up any session', () => {
    const pairing = service.createTutorialPairing('user-1');
    expect(pairing.token.length).toBeGreaterThanOrEqual(24);
    expect(pairing.code).toMatch(/^\d{6}$/);
    expect(Date.parse(pairing.expiresAt)).toBeGreaterThan(Date.now());
    expect(repository.findUserSession).not.toHaveBeenCalled();
  });
});
