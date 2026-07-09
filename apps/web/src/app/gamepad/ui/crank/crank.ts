import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { crankAngleDelta, crankPointerAngle } from '../../data-access/gamepad-logic';

const VIEWBOX_SIZE = 160;
const CENTER = VIEWBOX_SIZE / 2;
const DISC_RADIUS = 74;
const TICK_OUTER_RADIUS = 70;
const TICK_INNER_RADIUS = 64;
const TICK_COUNT = 24;
const HANDLE_ORBIT_RADIUS = 48;
const HANDLE_RADIUS = 13;
const PIVOT_RADIUS = 7;
const TRAIL_MAX_SWEEP_RAD = 1.7;
const TRAIL_MAX_OPACITY = 0.45;
const INITIAL_ANGLE_RAD = -Math.PI / 2;

interface CrankTick {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

@Component({
  selector: 'ui-crank',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './crank.html',
  styleUrl: './crank.css',
})
export class Crank {
  readonly label = input.required<string>();
  readonly hintClockwise = input.required<string>();
  readonly hintCounterClockwise = input.required<string>();
  readonly speed = input.required<number>();
  readonly disabled = input(false);

  readonly rotated = output<number>();

  protected readonly viewboxSize = VIEWBOX_SIZE;
  protected readonly center = CENTER;
  protected readonly discRadius = DISC_RADIUS;
  protected readonly handleRadius = HANDLE_RADIUS;
  protected readonly pivotRadius = PIVOT_RADIUS;

  protected readonly ticks: CrankTick[] = Array.from(
    { length: TICK_COUNT },
    (_, index) => {
      const angle = (index / TICK_COUNT) * 2 * Math.PI;
      return {
        x1: CENTER + Math.cos(angle) * TICK_INNER_RADIUS,
        y1: CENTER + Math.sin(angle) * TICK_INNER_RADIUS,
        x2: CENTER + Math.cos(angle) * TICK_OUTER_RADIUS,
        y2: CENTER + Math.sin(angle) * TICK_OUTER_RADIUS,
      };
    },
  );

  private readonly handleAngle = signal(INITIAL_ANGLE_RAD);
  private readonly surface = viewChild.required<ElementRef<SVGSVGElement>>('surface');
  private pointerId: number | null = null;
  private lastPointerAngle = 0;

  protected readonly handleX = computed(
    () => CENTER + Math.cos(this.handleAngle()) * HANDLE_ORBIT_RADIUS,
  );
  protected readonly handleY = computed(
    () => CENTER + Math.sin(this.handleAngle()) * HANDLE_ORBIT_RADIUS,
  );

  protected readonly trailPath = computed(() => {
    const speed = this.speed();
    if (this.disabled() || speed === 0) {
      return '';
    }
    const sweep = Math.min(1, Math.abs(speed)) * TRAIL_MAX_SWEEP_RAD;
    const endAngle = this.handleAngle();
    const startAngle = endAngle - Math.sign(speed) * sweep;
    const startX = CENTER + Math.cos(startAngle) * HANDLE_ORBIT_RADIUS;
    const startY = CENTER + Math.sin(startAngle) * HANDLE_ORBIT_RADIUS;
    const sweepFlag = speed > 0 ? 1 : 0;
    return `M ${startX.toFixed(2)} ${startY.toFixed(2)} A ${HANDLE_ORBIT_RADIUS} ${HANDLE_ORBIT_RADIUS} 0 0 ${sweepFlag} ${this.handleX().toFixed(2)} ${this.handleY().toFixed(2)}`;
  });

  protected readonly trailOpacity = computed(
    () => Math.min(1, Math.abs(this.speed())) * TRAIL_MAX_OPACITY,
  );

  protected onPointerDown(event: PointerEvent): void {
    if (this.disabled()) {
      return;
    }
    (event.target as Element).setPointerCapture(event.pointerId);
    this.pointerId = event.pointerId;
    this.lastPointerAngle = this.pointerAngle(event);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.disabled() || event.pointerId !== this.pointerId) {
      return;
    }
    const angle = this.pointerAngle(event);
    const delta = crankAngleDelta(this.lastPointerAngle, angle);
    this.lastPointerAngle = angle;
    this.handleAngle.update((current) => current + delta);
    this.rotated.emit(delta);
  }

  protected onPointerEnd(event: PointerEvent): void {
    if (event.pointerId === this.pointerId) {
      this.pointerId = null;
    }
  }

  private pointerAngle(event: PointerEvent): number {
    const rect = this.surface().nativeElement.getBoundingClientRect();
    return crankPointerAngle(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      event.clientX,
      event.clientY,
    );
  }
}
