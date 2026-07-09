import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import {
  GAMEPAD_LATENCY_GREEN_THRESHOLD_MS,
  GAMEPAD_PING_INTERVAL_MS,
  GamepadChannelMessage,
  GamepadConnectionState,
  GamepadHapticEffect,
  GamepadPairingDto,
  GamepadSessionPhase,
  GamepadTransportMode,
} from '@psychotech/shared';
import {
  GamepadLatencyStats,
  GamepadStickVector,
  acceptGamepadFrame,
  gamepadConnectionLost,
  gamepadLatencyStats,
  gamepadSignalingUrl,
  gamepadStickFromFrame,
} from './gamepad-logic';
import { GamepadTransport } from './gamepad-transport';
import { GamepadApi } from './gamepad.api';

const RTT_WINDOW_SIZE = 10;

@Injectable({ providedIn: 'root' })
export class GamepadFacade {
  private readonly api = inject(GamepadApi);

  private transport: GamepadTransport | null = null;
  private pingTimerId: number | null = null;
  private pingCounter = 0;
  private readonly pendingPings = new Map<number, number>();
  private rttWindow: number[] = [];
  private courseRttSamples: number[] = [];
  private lastSeq: number | null = null;
  private expiryTimerId: number | null = null;
  private pairedSessionId: string | null = null;

  private readonly pairingSignal = signal<GamepadPairingDto | null>(null);
  private readonly stateSignal = signal<GamepadConnectionState>(
    GamepadConnectionState.WAITING,
  );
  private readonly modeSignal = signal<GamepadTransportMode>('RELAY');
  private readonly latencySignal = signal<GamepadLatencyStats | null>(null);
  private readonly stickSignal = signal<GamepadStickVector>({ x: 0, y: 0 });
  private readonly lastFrameAtSignal = signal<number | null>(null);
  private readonly everConnectedSignal = signal(false);

  readonly pairing: Signal<GamepadPairingDto | null> =
    this.pairingSignal.asReadonly();
  readonly connectionState: Signal<GamepadConnectionState> =
    this.stateSignal.asReadonly();
  readonly transportMode: Signal<GamepadTransportMode> =
    this.modeSignal.asReadonly();
  readonly latency: Signal<GamepadLatencyStats | null> =
    this.latencySignal.asReadonly();
  readonly stick: Signal<GamepadStickVector> = this.stickSignal.asReadonly();
  readonly everConnected: Signal<boolean> =
    this.everConnectedSignal.asReadonly();

  readonly connected: Signal<boolean> = computed(
    () => this.stateSignal() === GamepadConnectionState.CONNECTED,
  );

  readonly latencyIsGood: Signal<boolean> = computed(() => {
    const latency = this.latencySignal();
    return latency !== null && latency.avgMs < GAMEPAD_LATENCY_GREEN_THRESHOLD_MS;
  });

  pair(sessionId: string): void {
    const keepExclusivity = this.everConnectedSignal();
    this.disconnect();
    this.everConnectedSignal.set(keepExclusivity);
    this.pairedSessionId = sessionId;
    this.api.createPairing(sessionId).subscribe({
      next: (pairing) => {
        this.pairingSignal.set(pairing);
        this.openTransport(pairing.token);
        this.armExpiryTimer(pairing);
      },
    });
  }

  gamepadInputLost(nowMs: number): boolean {
    return (
      !this.connected() || gamepadConnectionLost(this.lastFrameAtSignal(), nowMs)
    );
  }

  sendHaptic(effect: GamepadHapticEffect): void {
    this.transport?.send({ kind: 'haptic', effect });
  }

  sendPhase(phase: GamepadSessionPhase): void {
    this.transport?.send({ kind: 'phase', phase });
  }

  beginCourseLatencyWindow(): void {
    this.courseRttSamples = [];
  }

  courseLatency(): GamepadLatencyStats | null {
    return gamepadLatencyStats(this.courseRttSamples);
  }

  disconnect(): void {
    this.stopPingLoop();
    this.clearExpiryTimer();
    if (this.transport) {
      this.transport.close();
      this.transport = null;
    }
    this.pairingSignal.set(null);
    this.stateSignal.set(GamepadConnectionState.WAITING);
    this.modeSignal.set('RELAY');
    this.latencySignal.set(null);
    this.stickSignal.set({ x: 0, y: 0 });
    this.lastFrameAtSignal.set(null);
    this.everConnectedSignal.set(false);
    this.pendingPings.clear();
    this.rttWindow = [];
    this.courseRttSamples = [];
    this.lastSeq = null;
    this.pairedSessionId = null;
  }

  private openTransport(token: string): void {
    const forceRelay = new URLSearchParams(window.location.search).get(
      'transport',
    ) === 'relay';
    this.transport = new GamepadTransport({
      url: gamepadSignalingUrl(window.location),
      token,
      role: 'DESKTOP',
      forceRelay,
      onMessage: (message) => this.handleChannelMessage(message),
      onStateChange: (state) => {
        this.stateSignal.set(state);
        if (state === GamepadConnectionState.CONNECTED) {
          this.everConnectedSignal.set(true);
          this.clearExpiryTimer();
          this.startPingLoop();
        } else {
          this.stopPingLoop();
        }
      },
      onModeChange: (mode) => this.modeSignal.set(mode),
      onError: () => this.stateSignal.set(GamepadConnectionState.DISCONNECTED),
    });
    this.transport.connect();
  }

  private handleChannelMessage(message: GamepadChannelMessage): void {
    if (message.kind === 'input') {
      if (!acceptGamepadFrame(this.lastSeq, message)) {
        return;
      }
      this.lastSeq = message.seq;
      this.stickSignal.set(gamepadStickFromFrame(message));
      this.lastFrameAtSignal.set(performance.now());
      return;
    }
    if (message.kind === 'pong') {
      const sentAt = this.pendingPings.get(message.id);
      if (sentAt === undefined) {
        return;
      }
      this.pendingPings.delete(message.id);
      const rtt = performance.now() - sentAt;
      this.rttWindow = [...this.rttWindow.slice(-(RTT_WINDOW_SIZE - 1)), rtt];
      this.courseRttSamples.push(rtt);
      this.latencySignal.set(gamepadLatencyStats(this.rttWindow));
    }
  }

  private startPingLoop(): void {
    if (this.pingTimerId !== null) {
      return;
    }
    this.pingTimerId = window.setInterval(() => {
      this.pingCounter += 1;
      this.pendingPings.set(this.pingCounter, performance.now());
      this.transport?.send({
        kind: 'ping',
        id: this.pingCounter,
        t: Math.round(performance.now()),
      });
    }, GAMEPAD_PING_INTERVAL_MS);
  }

  private stopPingLoop(): void {
    if (this.pingTimerId !== null) {
      window.clearInterval(this.pingTimerId);
      this.pingTimerId = null;
    }
  }

  private armExpiryTimer(pairing: GamepadPairingDto): void {
    this.clearExpiryTimer();
    const delayMs = Math.max(0, Date.parse(pairing.expiresAt) - Date.now());
    this.expiryTimerId = window.setTimeout(() => {
      if (!this.connected() && this.pairedSessionId) {
        this.pair(this.pairedSessionId);
      }
    }, delayMs);
  }

  private clearExpiryTimer(): void {
    if (this.expiryTimerId !== null) {
      window.clearTimeout(this.expiryTimerId);
      this.expiryTimerId = null;
    }
  }
}
