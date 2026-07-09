import { GamepadInputFrame } from '@psychotech/shared';
import {
  acceptGamepadFrame,
  applyGamepadDeadzone,
  gamepadConnectionLost,
  gamepadLatencyStats,
  gamepadSignalingUrl,
  gamepadStickFromFrame,
} from './gamepad-logic';

function frame(seq: number, x = 0, y = 0): GamepadInputFrame {
  return { kind: 'input', seq, t: seq * 16, x, y };
}

describe('applyGamepadDeadzone', () => {
  it('zeroes deflections below ten percent', () => {
    expect(applyGamepadDeadzone(0.05)).toBe(0);
    expect(applyGamepadDeadzone(-0.09)).toBe(0);
  });

  it('rescales deflections beyond the deadzone up to full scale', () => {
    expect(applyGamepadDeadzone(1)).toBe(1);
    expect(applyGamepadDeadzone(-1)).toBe(-1);
    expect(applyGamepadDeadzone(0.55)).toBeCloseTo(0.5, 5);
    expect(applyGamepadDeadzone(-0.55)).toBeCloseTo(-0.5, 5);
  });
});

describe('acceptGamepadFrame', () => {
  it('accepts the first frame and strictly increasing sequences', () => {
    expect(acceptGamepadFrame(null, frame(1))).toBe(true);
    expect(acceptGamepadFrame(1, frame(2))).toBe(true);
  });

  it('ignores stale or duplicated frames', () => {
    expect(acceptGamepadFrame(5, frame(5))).toBe(false);
    expect(acceptGamepadFrame(5, frame(3))).toBe(false);
  });
});

describe('gamepadStickFromFrame', () => {
  it('clamps raw values then applies the deadzone', () => {
    const stick = gamepadStickFromFrame(frame(1, 2, -0.05));
    expect(stick.x).toBe(1);
    expect(stick.y).toBe(0);
  });
});

describe('gamepadConnectionLost', () => {
  it('flags a connection without any packet for more than two seconds', () => {
    expect(gamepadConnectionLost(null, 1000)).toBe(true);
    expect(gamepadConnectionLost(1000, 3001)).toBe(true);
  });

  it('keeps a connection alive within the heartbeat window', () => {
    expect(gamepadConnectionLost(1000, 2999)).toBe(false);
  });
});

describe('gamepadLatencyStats', () => {
  it('returns null without samples', () => {
    expect(gamepadLatencyStats([])).toBeNull();
  });

  it('computes the average round trip and the mean absolute jitter', () => {
    const stats = gamepadLatencyStats([20, 30, 40]);
    expect(stats?.avgMs).toBe(30);
    expect(stats?.jitterMs).toBeCloseTo(20 / 3, 5);
  });
});

describe('gamepadSignalingUrl', () => {
  it('derives the gateway url from the page location', () => {
    expect(
      gamepadSignalingUrl({ protocol: 'http:', host: '192.168.1.20:4200' }),
    ).toBe('ws://192.168.1.20:4200/gamepad');
    expect(
      gamepadSignalingUrl({ protocol: 'https:', host: 'app.psychotech.fr' }),
    ).toBe('wss://app.psychotech.fr/gamepad');
  });
});
