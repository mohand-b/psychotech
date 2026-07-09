export const GAMEPAD_PAIRING_TTL_MS = 3 * 60 * 1000;
export const GAMEPAD_PAIRING_CODE_LENGTH = 6;
export const GAMEPAD_INPUT_RATE_HZ = 60;
export const GAMEPAD_INPUT_DEADZONE = 0.1;
export const GAMEPAD_PING_INTERVAL_MS = 1000;
export const GAMEPAD_HEARTBEAT_TIMEOUT_MS = 2000;
export const GAMEPAD_ICE_TIMEOUT_MS = 5000;
export const GAMEPAD_LATENCY_GREEN_THRESHOLD_MS = 40;
export const GAMEPAD_MAX_OVERDRIVE = 1.5;
export const GAMEPAD_STUN_SERVERS = ['stun:stun.l.google.com:19302'];
export const GAMEPAD_SIGNALING_PATH = '/gamepad';

export type GamepadPeerRole = 'DESKTOP' | 'PHONE';

export type GamepadTransportMode = 'DATA_CHANNEL' | 'RELAY';

export enum GamepadConnectionState {
  WAITING = 'WAITING',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
}

export type GamepadSignalErrorCode =
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_CONSUMED'
  | 'ROOM_FULL';

export interface GamepadJoinMessage {
  type: 'join';
  role: GamepadPeerRole;
  token: string;
}

export interface GamepadJoinedMessage {
  type: 'joined';
  role: GamepadPeerRole;
  peerPresent: boolean;
}

export interface GamepadPeerJoinedMessage {
  type: 'peer-joined';
  role: GamepadPeerRole;
}

export interface GamepadPeerLeftMessage {
  type: 'peer-left';
  role: GamepadPeerRole;
}

export interface GamepadOfferMessage {
  type: 'offer';
  sdp: string;
}

export interface GamepadAnswerMessage {
  type: 'answer';
  sdp: string;
}

export interface GamepadIceMessage {
  type: 'ice';
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

export interface GamepadRelayMessage {
  type: 'relay';
  payload: GamepadChannelMessage;
}

export interface GamepadErrorMessage {
  type: 'error';
  code: GamepadSignalErrorCode;
}

export type GamepadSignalMessage =
  | GamepadJoinMessage
  | GamepadJoinedMessage
  | GamepadPeerJoinedMessage
  | GamepadPeerLeftMessage
  | GamepadOfferMessage
  | GamepadAnswerMessage
  | GamepadIceMessage
  | GamepadRelayMessage
  | GamepadErrorMessage;

export interface GamepadInputFrame {
  kind: 'input';
  seq: number;
  t: number;
  x: number;
  y: number;
}

export interface GamepadPingMessage {
  kind: 'ping';
  id: number;
  t: number;
}

export interface GamepadPongMessage {
  kind: 'pong';
  id: number;
  t: number;
}

export type GamepadHapticEffect = 'CONTACT' | 'EXIT';

export interface GamepadHapticMessage {
  kind: 'haptic';
  effect: GamepadHapticEffect;
}

export type GamepadSessionPhase = 'WAITING' | 'ACTIVE' | 'SUSPENDED' | 'FINISHED';

export interface GamepadPhaseMessage {
  kind: 'phase';
  phase: GamepadSessionPhase;
}

export type GamepadChannelMessage =
  | GamepadInputFrame
  | GamepadPingMessage
  | GamepadPongMessage
  | GamepadHapticMessage
  | GamepadPhaseMessage;
