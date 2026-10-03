import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  viewChild,
} from '@angular/core';
import { GamepadPairingDto } from '@psychotech/shared';
import QRCode from 'qrcode';
import {
  GamepadLatencyStats,
  buildGamepadControllerUrl,
} from '../../util/gamepad-logic';

const QR_SIZE_PX = 148;

@Component({
  selector: 'ui-gamepad-pairing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gamepad-pairing.html',
  styleUrl: './gamepad-pairing.css',
})
export class GamepadPairing {
  readonly pairing = input.required<GamepadPairingDto | null>();
  readonly connected = input.required<boolean>();
  readonly latency = input.required<GamepadLatencyStats | null>();
  readonly latencyGood = input.required<boolean>();
  readonly variant = input<'compact' | 'briefing'>('compact');

  private readonly qrCanvas =
    viewChild<ElementRef<HTMLCanvasElement>>('qrCanvas');

  constructor() {
    effect(() => {
      const pairing = this.pairing();
      const canvas = this.qrCanvas()?.nativeElement;
      if (!pairing || !canvas || this.connected()) {
        return;
      }
      const ink = getComputedStyle(document.documentElement)
        .getPropertyValue('--ink')
        .trim();
      void QRCode.toCanvas(
        canvas,
        buildGamepadControllerUrl(window.location.origin, pairing.token),
        {
          width: QR_SIZE_PX,
          margin: 1,
          color: { dark: ink, light: '#ffffff' },
        },
      );
    });
  }

  protected readonly formattedCode = computed(() => {
    const code = this.pairing()?.code ?? '';
    return `${code.slice(0, 3)} ${code.slice(3)}`;
  });

  protected readonly latencyLabel = computed(() => {
    const latency = this.latency();
    return latency ? `${Math.round(latency.avgMs)} ms` : '';
  });
}
