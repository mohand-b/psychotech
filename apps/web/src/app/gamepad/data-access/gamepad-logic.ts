import {
  GAMEPAD_HEARTBEAT_TIMEOUT_MS,
  GAMEPAD_INPUT_DEADZONE,
  GAMEPAD_SIGNALING_PATH,
  GamepadInputFrame,
} from '@psychotech/shared';

export interface GamepadStickVector {
  x: number;
  y: number;
}

export interface GamepadLatencyStats {
  avgMs: number;
  jitterMs: number;
}

export function applyGamepadDeadzone(value: number): number {
  const magnitude = Math.abs(value);
  if (magnitude < GAMEPAD_INPUT_DEADZONE) {
    return 0;
  }
  const rescaled =
    (magnitude - GAMEPAD_INPUT_DEADZONE) / (1 - GAMEPAD_INPUT_DEADZONE);
  return Math.sign(value) * Math.min(1, rescaled);
}

export function acceptGamepadFrame(
  lastSeq: number | null,
  frame: GamepadInputFrame,
): boolean {
  return lastSeq === null || frame.seq > lastSeq;
}

export function gamepadStickFromFrame(
  frame: GamepadInputFrame,
): GamepadStickVector {
  return {
    x: applyGamepadDeadzone(Math.max(-1, Math.min(1, frame.x))),
    y: applyGamepadDeadzone(Math.max(-1, Math.min(1, frame.y))),
  };
}

export function gamepadConnectionLost(
  lastMessageAtMs: number | null,
  nowMs: number,
): boolean {
  return (
    lastMessageAtMs === null ||
    nowMs - lastMessageAtMs > GAMEPAD_HEARTBEAT_TIMEOUT_MS
  );
}

export function gamepadLatencyStats(
  rttSamples: number[],
): GamepadLatencyStats | null {
  if (rttSamples.length === 0) {
    return null;
  }
  const avgMs =
    rttSamples.reduce((sum, sample) => sum + sample, 0) / rttSamples.length;
  const jitterMs =
    rttSamples.reduce((sum, sample) => sum + Math.abs(sample - avgMs), 0) /
    rttSamples.length;
  return { avgMs, jitterMs };
}

export function gamepadSignalingUrl(location: {
  protocol: string;
  host: string;
}): string {
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${location.host}${GAMEPAD_SIGNALING_PATH}`;
}

export function gamepadControllerUrl(origin: string, token: string): string {
  return `${origin}/manette?t=${encodeURIComponent(token)}`;
}

export const GAMEPAD_CRANK_FULL_SPEED_RAD_PER_SEC = 2 * Math.PI;

export function crankPointerAngle(
  centerX: number,
  centerY: number,
  pointX: number,
  pointY: number,
): number {
  return Math.atan2(pointY - centerY, pointX - centerX);
}

export function crankAngleDelta(
  previousRad: number,
  nextRad: number,
): number {
  let delta = nextRad - previousRad;
  while (delta > Math.PI) {
    delta -= 2 * Math.PI;
  }
  while (delta < -Math.PI) {
    delta += 2 * Math.PI;
  }
  return delta;
}

export function crankValueFromVelocity(radPerSec: number): number {
  return Math.max(
    -1,
    Math.min(1, radPerSec / GAMEPAD_CRANK_FULL_SPEED_RAD_PER_SEC),
  );
}
