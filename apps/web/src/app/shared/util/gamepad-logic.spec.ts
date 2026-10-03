import { GAMEPAD_MAX_OVERDRIVE, GamepadInputFrame } from '@psychotech/shared';
import {
  GAMEPAD_CRANK_FULL_SPEED_RAD_PER_SEC,
  GAMEPAD_CRANK_SPEED_SMOOTHING,
  isNewerGamepadFrame,
  applyGamepadDeadzone,
  computeCrankAngleDelta,
  computeCrankPointerAngle,
  smoothCrankSpeed,
  normalizeCrankVelocity,
  isGamepadConnectionLost,
  computeGamepadLatencyStats,
  buildGamepadSignalingUrl,
  computeGamepadStick,
} from './gamepad-logic';

function frame(seq: number, x = 0, y = 0): GamepadInputFrame {
  return { kind: 'input', seq, t: seq * 16, x, y };
}

describe('applyGamepadDeadzone', () => {
  it('zeroes deflections below ten percent', () => {
    expect(applyGamepadDeadzone(0.05)).toBe(0);
    expect(applyGamepadDeadzone(-0.09)).toBe(0);
  });

  it('rescales deflections beyond the deadzone up to the overdrive cap', () => {
    expect(applyGamepadDeadzone(1)).toBe(1);
    expect(applyGamepadDeadzone(-1)).toBe(-1);
    expect(applyGamepadDeadzone(0.55)).toBeCloseTo(0.5, 5);
    expect(applyGamepadDeadzone(-0.55)).toBeCloseTo(-0.5, 5);
    expect(applyGamepadDeadzone(3)).toBe(GAMEPAD_MAX_OVERDRIVE);
    expect(applyGamepadDeadzone(-3)).toBe(-GAMEPAD_MAX_OVERDRIVE);
  });
});

describe('isNewerGamepadFrame', () => {
  it('accepts the first frame and strictly increasing sequences', () => {
    expect(isNewerGamepadFrame(null, frame(1))).toBe(true);
    expect(isNewerGamepadFrame(1, frame(2))).toBe(true);
  });

  it('ignores stale or duplicated frames', () => {
    expect(isNewerGamepadFrame(5, frame(5))).toBe(false);
    expect(isNewerGamepadFrame(5, frame(3))).toBe(false);
  });
});

describe('computeGamepadStick', () => {
  it('clamps raw values to the overdrive cap then applies the deadzone', () => {
    const stick = computeGamepadStick(frame(1, 2, -0.05));
    expect(stick.x).toBe(GAMEPAD_MAX_OVERDRIVE);
    expect(stick.y).toBe(0);
    expect(computeGamepadStick(frame(2, 0.55, 0)).x).toBeCloseTo(0.5, 5);
  });
});

describe('isGamepadConnectionLost', () => {
  it('flags a connection without any packet for more than two seconds', () => {
    expect(isGamepadConnectionLost(null, 1000)).toBe(true);
    expect(isGamepadConnectionLost(1000, 3001)).toBe(true);
  });

  it('keeps a connection alive within the heartbeat window', () => {
    expect(isGamepadConnectionLost(1000, 2999)).toBe(false);
  });
});

describe('computeGamepadLatencyStats', () => {
  it('returns null without samples', () => {
    expect(computeGamepadLatencyStats([])).toBeNull();
  });

  it('computes the average round trip and the mean absolute jitter', () => {
    const stats = computeGamepadLatencyStats([20, 30, 40]);
    expect(stats?.avgMs).toBe(30);
    expect(stats?.jitterMs).toBeCloseTo(20 / 3, 5);
  });
});

describe('computeCrankPointerAngle', () => {
  it('measures the pointer angle around the crank center in screen space', () => {
    expect(computeCrankPointerAngle(80, 80, 160, 80)).toBeCloseTo(0, 5);
    expect(computeCrankPointerAngle(80, 80, 80, 160)).toBeCloseTo(
      Math.PI / 2,
      5,
    );
    expect(computeCrankPointerAngle(80, 80, 80, 0)).toBeCloseTo(
      -Math.PI / 2,
      5,
    );
  });
});

describe('computeCrankAngleDelta', () => {
  it('returns the signed rotation with clockwise positive', () => {
    expect(computeCrankAngleDelta(0, 0.3)).toBeCloseTo(0.3, 5);
    expect(computeCrankAngleDelta(0.3, 0)).toBeCloseTo(-0.3, 5);
  });

  it('wraps across the atan2 discontinuity so a continuous turn never jumps', () => {
    expect(computeCrankAngleDelta(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(
      0.2,
      5,
    );
    expect(computeCrankAngleDelta(-Math.PI + 0.1, Math.PI - 0.1)).toBeCloseTo(
      -0.2,
      5,
    );
  });
});

describe('normalizeCrankVelocity', () => {
  it('maps one full turn per second to full speed and allows overdrive up to the cap', () => {
    expect(normalizeCrankVelocity(GAMEPAD_CRANK_FULL_SPEED_RAD_PER_SEC)).toBe(
      1,
    );
    expect(
      normalizeCrankVelocity(GAMEPAD_CRANK_FULL_SPEED_RAD_PER_SEC * 1.25),
    ).toBeCloseTo(1.25, 5);
    expect(
      normalizeCrankVelocity(GAMEPAD_CRANK_FULL_SPEED_RAD_PER_SEC * 3),
    ).toBe(GAMEPAD_MAX_OVERDRIVE);
    expect(
      normalizeCrankVelocity(-GAMEPAD_CRANK_FULL_SPEED_RAD_PER_SEC * 2),
    ).toBe(-GAMEPAD_MAX_OVERDRIVE);
  });

  it('is proportional below full speed and zero at rest', () => {
    expect(
      normalizeCrankVelocity(GAMEPAD_CRANK_FULL_SPEED_RAD_PER_SEC / 2),
    ).toBeCloseTo(0.5, 5);
    expect(normalizeCrankVelocity(0)).toBe(0);
  });
});

describe('smoothCrankSpeed', () => {
  it('eases toward the target speed with the shared smoothing factor', () => {
    expect(
      smoothCrankSpeed(0, GAMEPAD_CRANK_FULL_SPEED_RAD_PER_SEC),
    ).toBeCloseTo(GAMEPAD_CRANK_SPEED_SMOOTHING, 5);
    expect(
      smoothCrankSpeed(1, GAMEPAD_CRANK_FULL_SPEED_RAD_PER_SEC),
    ).toBeCloseTo(1, 5);
  });

  it('snaps to zero once at rest below the epsilon', () => {
    expect(smoothCrankSpeed(0.01, 0)).toBe(0);
    expect(smoothCrankSpeed(0.5, 0)).toBeCloseTo(0.325, 5);
  });
});

describe('buildGamepadSignalingUrl', () => {
  it('derives the gateway url from the page location', () => {
    expect(
      buildGamepadSignalingUrl({
        protocol: 'http:',
        host: '192.168.1.20:4200',
      }),
    ).toBe('ws://192.168.1.20:4200/gamepad');
    expect(
      buildGamepadSignalingUrl({
        protocol: 'https:',
        host: 'app.psychotech.fr',
      }),
    ).toBe('wss://app.psychotech.fr/gamepad');
  });
});
