import { Injectable, Signal, signal } from '@angular/core';
import {
  GAMEPAD_HEARTBEAT_TIMEOUT_MS,
  GAMEPAD_INPUT_RATE_HZ,
  GamepadChannelMessage,
  GamepadConnectionState,
  GamepadHapticEffect,
  GamepadSignalErrorCode,
} from '@psychotech/shared';
import { crankSmoothedSpeed, gamepadSignalingUrl } from './gamepad-logic';
import { GamepadTransport } from './gamepad-transport';

export type GamepadControllerView =
  | 'ENTER_CODE'
  | 'INVALID'
  | 'WAITING'
  | 'CONNECTED'
  | 'SUSPENDED'
  | 'FINISHED';

const RECONNECT_DELAY_MS = 1500;

const HAPTIC_PATTERNS: Record<GamepadHapticEffect, number | number[]> = {
  CONTACT: 40,
  EXIT: [90, 50, 90],
};

const ERROR_MESSAGES: Record<GamepadSignalErrorCode, string> = {
  INVALID_TOKEN: 'Ce lien de connexion est invalide.',
  TOKEN_EXPIRED:
    "Ce lien de connexion a expiré. Scannez à nouveau le QR code affiché sur l'ordinateur.",
  TOKEN_CONSUMED: 'Ce lien de connexion a déjà été utilisé.',
  ROOM_FULL: 'Un autre appareil est déjà connecté à cette session.',
};

@Injectable()
export class GamepadControllerFacade {
  private readonly viewSignal = signal<GamepadControllerView>('ENTER_CODE');
  private readonly errorMessageSignal = signal<string | null>(null);
  private readonly leftSpeedSignal = signal(0);
  private readonly rightSpeedSignal = signal(0);

  readonly view: Signal<GamepadControllerView> = this.viewSignal.asReadonly();
  readonly errorMessage: Signal<string | null> =
    this.errorMessageSignal.asReadonly();
  readonly leftSpeed: Signal<number> = this.leftSpeedSignal.asReadonly();
  readonly rightSpeed: Signal<number> = this.rightSpeedSignal.asReadonly();

  private transport: GamepadTransport | null = null;
  private inputTimerId: number | null = null;
  private watchdogTimerId: number | null = null;
  private reconnectTimerId: number | null = null;
  private seq = 0;
  private lastPingAtMs: number | null = null;
  private lastTickAtMs: number | null = null;
  private leftPendingDeltaRad = 0;
  private rightPendingDeltaRad = 0;
  private activeToken: string | null = null;
  private forceRelay = false;
  private finished = false;
  private wakeLock: { release: () => Promise<void> } | null = null;

  connect(token: string, forceRelay: boolean): void {
    this.forceRelay = forceRelay;
    this.openTransport(token);
  }

  pushLeftRotation(deltaRad: number): void {
    this.leftPendingDeltaRad += deltaRad;
  }

  pushRightRotation(deltaRad: number): void {
    this.rightPendingDeltaRad += deltaRad;
  }

  refreshWakeLock(): void {
    if (this.viewSignal() === 'CONNECTED') {
      void this.requestWakeLock();
    }
  }

  release(): void {
    this.teardownTransport();
    this.activeToken = null;
    if (this.wakeLock) {
      void this.wakeLock.release();
      this.wakeLock = null;
    }
  }

  private openTransport(token: string): void {
    this.teardownTransport();
    this.activeToken = token;
    this.finished = false;
    this.errorMessageSignal.set(null);
    this.viewSignal.set('WAITING');
    this.transport = new GamepadTransport({
      url: gamepadSignalingUrl(window.location),
      token,
      role: 'PHONE',
      forceRelay: this.forceRelay,
      onMessage: (message) => this.handleChannelMessage(message),
      onStateChange: (state) => this.handleStateChange(state),
      onModeChange: () => undefined,
      onError: (errorCode) => {
        this.teardownTransport();
        this.activeToken = null;
        this.errorMessageSignal.set(ERROR_MESSAGES[errorCode]);
        this.viewSignal.set('INVALID');
      },
    });
    this.transport.connect();
  }

  private handleStateChange(state: GamepadConnectionState): void {
    if (this.finished) {
      return;
    }
    if (state === GamepadConnectionState.CONNECTED) {
      this.viewSignal.set('CONNECTED');
      this.lastPingAtMs = performance.now();
      this.startInputLoop();
      void this.requestWakeLock();
      return;
    }
    if (state === GamepadConnectionState.WAITING) {
      this.viewSignal.set('WAITING');
      this.stopInputLoop();
      return;
    }
    if (state === GamepadConnectionState.DISCONNECTED) {
      this.viewSignal.set('WAITING');
      this.stopInputLoop();
      this.scheduleReconnect();
    }
  }

  private handleChannelMessage(message: GamepadChannelMessage): void {
    if (message.kind === 'ping') {
      this.lastPingAtMs = performance.now();
      if (this.viewSignal() === 'SUSPENDED') {
        this.viewSignal.set('CONNECTED');
      }
      this.transport?.send({ kind: 'pong', id: message.id, t: message.t });
      return;
    }
    if (message.kind === 'haptic') {
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(HAPTIC_PATTERNS[message.effect]);
      }
      return;
    }
    if (message.kind === 'phase' && message.phase === 'FINISHED') {
      this.finished = true;
      this.viewSignal.set('FINISHED');
      this.teardownTransport();
    }
  }

  private startInputLoop(): void {
    if (this.inputTimerId !== null) {
      return;
    }
    this.lastTickAtMs = null;
    this.inputTimerId = window.setInterval(() => {
      const now = performance.now();
      const dtSec =
        this.lastTickAtMs === null
          ? 1 / GAMEPAD_INPUT_RATE_HZ
          : Math.max(1 / 1000, (now - this.lastTickAtMs) / 1000);
      this.lastTickAtMs = now;
      this.leftSpeedSignal.set(
        crankSmoothedSpeed(
          this.leftSpeedSignal(),
          this.leftPendingDeltaRad / dtSec,
        ),
      );
      this.rightSpeedSignal.set(
        crankSmoothedSpeed(
          this.rightSpeedSignal(),
          this.rightPendingDeltaRad / dtSec,
        ),
      );
      this.leftPendingDeltaRad = 0;
      this.rightPendingDeltaRad = 0;
      this.seq += 1;
      this.transport?.send({
        kind: 'input',
        seq: this.seq,
        t: Math.round(now),
        x: this.leftSpeedSignal(),
        y: this.rightSpeedSignal(),
      });
    }, 1000 / GAMEPAD_INPUT_RATE_HZ);
    this.watchdogTimerId = window.setInterval(() => {
      if (
        this.viewSignal() === 'CONNECTED' &&
        this.lastPingAtMs !== null &&
        performance.now() - this.lastPingAtMs > GAMEPAD_HEARTBEAT_TIMEOUT_MS
      ) {
        this.viewSignal.set('SUSPENDED');
      }
    }, GAMEPAD_HEARTBEAT_TIMEOUT_MS / 2);
  }

  private stopInputLoop(): void {
    if (this.inputTimerId !== null) {
      window.clearInterval(this.inputTimerId);
      this.inputTimerId = null;
    }
    if (this.watchdogTimerId !== null) {
      window.clearInterval(this.watchdogTimerId);
      this.watchdogTimerId = null;
    }
    this.leftSpeedSignal.set(0);
    this.rightSpeedSignal.set(0);
    this.leftPendingDeltaRad = 0;
    this.rightPendingDeltaRad = 0;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimerId !== null || !this.activeToken) {
      return;
    }
    this.reconnectTimerId = window.setTimeout(() => {
      this.reconnectTimerId = null;
      if (this.activeToken && !this.finished) {
        this.openTransport(this.activeToken);
      }
    }, RECONNECT_DELAY_MS);
  }

  private async requestWakeLock(): Promise<void> {
    try {
      const wakeLockApi = (
        navigator as Navigator & {
          wakeLock?: {
            request(type: 'screen'): Promise<{ release(): Promise<void> }>;
          };
        }
      ).wakeLock;
      if (wakeLockApi) {
        this.wakeLock = await wakeLockApi.request('screen');
      }
    } catch {
      this.wakeLock = null;
    }
  }

  private teardownTransport(): void {
    this.stopInputLoop();
    if (this.reconnectTimerId !== null) {
      window.clearTimeout(this.reconnectTimerId);
      this.reconnectTimerId = null;
    }
    if (this.transport) {
      this.transport.close();
      this.transport = null;
    }
  }
}
