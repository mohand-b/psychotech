import { describe, expect, it } from 'vitest';
import {
  parseGamepadChannelMessage,
  parseGamepadSignalMessage,
} from './parse-signal-message';

describe('parseGamepadSignalMessage', () => {
  it('accepts a well-formed join', () => {
    expect(
      parseGamepadSignalMessage({
        type: 'join',
        role: 'PHONE',
        token: 'tok-1',
      }),
    ).toEqual({ type: 'join', role: 'PHONE', token: 'tok-1' });
  });

  it('rejects a join whose role is not a known peer role', () => {
    expect(
      parseGamepadSignalMessage({ type: 'join', role: 'ADMIN', token: 'tok-1' }),
    ).toBeNull();
    expect(
      parseGamepadSignalMessage({ type: 'join', token: 'tok-1' }),
    ).toBeNull();
  });

  it('rejects a join without a usable token', () => {
    expect(
      parseGamepadSignalMessage({ type: 'join', role: 'PHONE', token: '' }),
    ).toBeNull();
    expect(
      parseGamepadSignalMessage({ type: 'join', role: 'PHONE', token: 42 }),
    ).toBeNull();
  });

  it('rejects non-object payloads and unknown types', () => {
    expect(parseGamepadSignalMessage(null)).toBeNull();
    expect(parseGamepadSignalMessage('join')).toBeNull();
    expect(parseGamepadSignalMessage({ type: 'evil' })).toBeNull();
    expect(parseGamepadSignalMessage({})).toBeNull();
  });

  it('keeps only the declared fields of an ice candidate', () => {
    expect(
      parseGamepadSignalMessage({
        type: 'ice',
        candidate: 'cand',
        sdpMid: null,
        sdpMLineIndex: 0,
        injected: 'dropped',
      }),
    ).toEqual({
      type: 'ice',
      candidate: 'cand',
      sdpMid: null,
      sdpMLineIndex: 0,
    });
  });

  it('validates the relayed channel payload', () => {
    expect(
      parseGamepadSignalMessage({
        type: 'relay',
        payload: { kind: 'ping', id: 1, t: 2 },
      }),
    ).toEqual({ type: 'relay', payload: { kind: 'ping', id: 1, t: 2 } });
    expect(
      parseGamepadSignalMessage({ type: 'relay', payload: { kind: 'evil' } }),
    ).toBeNull();
    expect(parseGamepadSignalMessage({ type: 'relay' })).toBeNull();
  });
});

describe('parseGamepadChannelMessage', () => {
  it('accepts a complete input frame', () => {
    expect(
      parseGamepadChannelMessage({ kind: 'input', seq: 1, t: 2, x: 0.5, y: -1 }),
    ).toEqual({ kind: 'input', seq: 1, t: 2, x: 0.5, y: -1 });
  });

  it('rejects an input frame with a missing or non-finite axis', () => {
    expect(
      parseGamepadChannelMessage({ kind: 'input', seq: 1, t: 2, x: 0.5 }),
    ).toBeNull();
    expect(
      parseGamepadChannelMessage({
        kind: 'input',
        seq: 1,
        t: 2,
        x: Number.NaN,
        y: 0,
      }),
    ).toBeNull();
  });

  it('rejects unknown haptic effects and session phases', () => {
    expect(
      parseGamepadChannelMessage({ kind: 'haptic', effect: 'BOOM' }),
    ).toBeNull();
    expect(
      parseGamepadChannelMessage({ kind: 'phase', phase: 'PAUSED' }),
    ).toBeNull();
  });

  it('accepts the declared haptic effects and session phases', () => {
    expect(
      parseGamepadChannelMessage({ kind: 'haptic', effect: 'CONTACT' }),
    ).toEqual({ kind: 'haptic', effect: 'CONTACT' });
    expect(
      parseGamepadChannelMessage({ kind: 'phase', phase: 'FINISHED' }),
    ).toEqual({ kind: 'phase', phase: 'FINISHED' });
  });
});
