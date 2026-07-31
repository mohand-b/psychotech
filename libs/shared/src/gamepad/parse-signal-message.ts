import {
  GamepadChannelMessage,
  GamepadHapticEffect,
  GamepadPeerRole,
  GamepadSessionPhase,
  GamepadSignalMessage,
} from './gamepad-protocol';

const PEER_ROLES: readonly GamepadPeerRole[] = ['DESKTOP', 'PHONE'];
const HAPTIC_EFFECTS: readonly GamepadHapticEffect[] = ['CONTACT', 'EXIT'];
const SESSION_PHASES: readonly GamepadSessionPhase[] = [
  'WAITING',
  'ACTIVE',
  'SUSPENDED',
  'FINISHED',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

export function parseGamepadChannelMessage(
  raw: unknown,
): GamepadChannelMessage | null {
  if (!isRecord(raw)) {
    return null;
  }
  switch (raw['kind']) {
    case 'input':
      return isFiniteNumber(raw['seq']) &&
        isFiniteNumber(raw['t']) &&
        isFiniteNumber(raw['x']) &&
        isFiniteNumber(raw['y'])
        ? {
            kind: 'input',
            seq: raw['seq'],
            t: raw['t'],
            x: raw['x'],
            y: raw['y'],
          }
        : null;
    case 'ping':
      return isFiniteNumber(raw['id']) && isFiniteNumber(raw['t'])
        ? { kind: 'ping', id: raw['id'], t: raw['t'] }
        : null;
    case 'pong':
      return isFiniteNumber(raw['id']) && isFiniteNumber(raw['t'])
        ? { kind: 'pong', id: raw['id'], t: raw['t'] }
        : null;
    case 'haptic':
      return HAPTIC_EFFECTS.includes(raw['effect'] as GamepadHapticEffect)
        ? { kind: 'haptic', effect: raw['effect'] as GamepadHapticEffect }
        : null;
    case 'phase':
      return SESSION_PHASES.includes(raw['phase'] as GamepadSessionPhase)
        ? { kind: 'phase', phase: raw['phase'] as GamepadSessionPhase }
        : null;
    default:
      return null;
  }
}

export function parseGamepadSignalMessage(
  raw: unknown,
): GamepadSignalMessage | null {
  if (!isRecord(raw)) {
    return null;
  }
  switch (raw['type']) {
    case 'join':
      return PEER_ROLES.includes(raw['role'] as GamepadPeerRole) &&
        isNonEmptyString(raw['token'])
        ? {
            type: 'join',
            role: raw['role'] as GamepadPeerRole,
            token: raw['token'],
          }
        : null;
    case 'offer':
      return isNonEmptyString(raw['sdp'])
        ? { type: 'offer', sdp: raw['sdp'] }
        : null;
    case 'answer':
      return isNonEmptyString(raw['sdp'])
        ? { type: 'answer', sdp: raw['sdp'] }
        : null;
    case 'ice':
      return isNonEmptyString(raw['candidate']) &&
        isNullableString(raw['sdpMid']) &&
        isNullableFiniteNumber(raw['sdpMLineIndex'])
        ? {
            type: 'ice',
            candidate: raw['candidate'],
            sdpMid: raw['sdpMid'],
            sdpMLineIndex: raw['sdpMLineIndex'],
          }
        : null;
    case 'relay': {
      const payload = parseGamepadChannelMessage(raw['payload']);
      return payload ? { type: 'relay', payload } : null;
    }
    default:
      return null;
  }
}
