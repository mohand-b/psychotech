import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  GAMEPAD_HEARTBEAT_TIMEOUT_MS,
  GAMEPAD_INPUT_RATE_HZ,
  GAMEPAD_PAIRING_CODE_LENGTH,
  GamepadChannelMessage,
  GamepadConnectionState,
  GamepadHapticEffect,
  GamepadSignalErrorCode,
} from '@psychotech/shared';
import {
  crankValueFromVelocity,
  gamepadSignalingUrl,
} from '../../data-access/gamepad-logic';
import { GamepadTransport } from '../../data-access/gamepad-transport';
import { Crank } from '../../ui/crank/crank';

type ManetteView =
  | 'ENTER_CODE'
  | 'INVALID'
  | 'WAITING'
  | 'CONNECTED'
  | 'SUSPENDED'
  | 'FINISHED';

const RECONNECT_DELAY_MS = 1500;
const SPEED_SMOOTHING = 0.35;
const SPEED_REST_EPSILON = 0.02;

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

interface StateChip {
  label: string;
  tone: 'success' | 'warning' | 'danger';
}

@Component({
  selector: 'app-manette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Crank],
  templateUrl: './manette.html',
  styleUrl: './manette.css',
})
export class Manette {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly view = signal<ManetteView>('ENTER_CODE');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly code = signal('');
  protected readonly leftSpeed = signal(0);
  protected readonly rightSpeed = signal(0);

  protected readonly codeLength = GAMEPAD_PAIRING_CODE_LENGTH;

  protected readonly codeReady = computed(
    () => this.code().length === GAMEPAD_PAIRING_CODE_LENGTH,
  );

  protected readonly cranksVisible = computed(() => {
    const view = this.view();
    return view === 'CONNECTED' || view === 'SUSPENDED';
  });

  protected readonly stateChip = computed<StateChip | null>(() => {
    switch (this.view()) {
      case 'CONNECTED':
        return { label: 'Connecté', tone: 'success' };
      case 'WAITING':
        return { label: 'En attente', tone: 'warning' };
      case 'SUSPENDED':
        return { label: 'Suspendu', tone: 'warning' };
      case 'INVALID':
        return { label: 'Lien expiré', tone: 'danger' };
      default:
        return null;
    }
  });

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
  private finished = false;
  private wakeLock: { release: () => Promise<void> } | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.teardown());
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.destroyRef.onDestroy(() =>
      document.removeEventListener('visibilitychange', this.onVisibilityChange),
    );
    const token = this.route.snapshot.queryParamMap.get('t');
    if (token) {
      this.connect(token);
    }
  }

  protected onCodeInput(event: Event): void {
    const digits = (event.target as HTMLInputElement).value
      .replace(/\D/g, '')
      .slice(0, GAMEPAD_PAIRING_CODE_LENGTH);
    (event.target as HTMLInputElement).value = digits;
    this.code.set(digits);
  }

  protected submitCode(): void {
    if (this.codeReady()) {
      this.connect(this.code());
    }
  }

  protected onLeftRotate(deltaRad: number): void {
    this.leftPendingDeltaRad += deltaRad;
  }

  protected onRightRotate(deltaRad: number): void {
    this.rightPendingDeltaRad += deltaRad;
  }

  private connect(token: string): void {
    this.teardownTransport();
    this.activeToken = token;
    this.finished = false;
    this.errorMessage.set(null);
    this.view.set('WAITING');
    const forceRelay =
      this.route.snapshot.queryParamMap.get('transport') === 'relay';
    this.transport = new GamepadTransport({
      url: gamepadSignalingUrl(window.location),
      token,
      role: 'PHONE',
      forceRelay,
      onMessage: (message) => this.handleChannelMessage(message),
      onStateChange: (state) => this.handleStateChange(state),
      onModeChange: () => undefined,
      onError: (errorCode) => {
        this.teardownTransport();
        this.activeToken = null;
        this.errorMessage.set(ERROR_MESSAGES[errorCode]);
        this.view.set('INVALID');
      },
    });
    this.transport.connect();
  }

  private handleStateChange(state: GamepadConnectionState): void {
    if (this.finished) {
      return;
    }
    if (state === GamepadConnectionState.CONNECTED) {
      this.view.set('CONNECTED');
      this.lastPingAtMs = performance.now();
      this.startInputLoop();
      void this.requestWakeLock();
      return;
    }
    if (state === GamepadConnectionState.WAITING) {
      this.view.set('WAITING');
      this.stopInputLoop();
      return;
    }
    if (state === GamepadConnectionState.DISCONNECTED) {
      this.view.set('WAITING');
      this.stopInputLoop();
      this.scheduleReconnect();
    }
  }

  private handleChannelMessage(message: GamepadChannelMessage): void {
    if (message.kind === 'ping') {
      this.lastPingAtMs = performance.now();
      if (this.view() === 'SUSPENDED') {
        this.view.set('CONNECTED');
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
      this.view.set('FINISHED');
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
      this.leftSpeed.set(
        this.smoothedSpeed(
          this.leftSpeed(),
          this.leftPendingDeltaRad / dtSec,
        ),
      );
      this.rightSpeed.set(
        this.smoothedSpeed(
          this.rightSpeed(),
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
        x: this.leftSpeed(),
        y: this.rightSpeed(),
      });
    }, 1000 / GAMEPAD_INPUT_RATE_HZ);
    this.watchdogTimerId = window.setInterval(() => {
      if (
        this.view() === 'CONNECTED' &&
        this.lastPingAtMs !== null &&
        performance.now() - this.lastPingAtMs > GAMEPAD_HEARTBEAT_TIMEOUT_MS
      ) {
        this.view.set('SUSPENDED');
      }
    }, GAMEPAD_HEARTBEAT_TIMEOUT_MS / 2);
  }

  private smoothedSpeed(previous: number, radPerSec: number): number {
    const target = crankValueFromVelocity(radPerSec);
    const smoothed = previous + (target - previous) * SPEED_SMOOTHING;
    return Math.abs(smoothed) < SPEED_REST_EPSILON && target === 0
      ? 0
      : smoothed;
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
    this.leftSpeed.set(0);
    this.rightSpeed.set(0);
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
        this.connect(this.activeToken);
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

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible' && this.view() === 'CONNECTED') {
      void this.requestWakeLock();
    }
  };

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

  private teardown(): void {
    this.teardownTransport();
    this.activeToken = null;
    if (this.wakeLock) {
      void this.wakeLock.release();
      this.wakeLock = null;
    }
  }
}
