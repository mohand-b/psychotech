import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { AxisType, roundToTenth } from '@psychotech/shared';
import { animate } from 'motion';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';

export interface AxisRadarEntry {
  axis: AxisType;
  score: number;
}

interface RadarPoint {
  x: number;
  y: number;
}

interface RadarVertex extends RadarPoint {
  colorVar: string;
}

const VIEW_WIDTH = 170;
const VIEW_HEIGHT = 130;
const CENTER_X = 85;
const CENTER_Y = 64;
const RADIUS = 48;
const MESH_LEVELS = [1 / 3, 2 / 3, 1];
const BUILD_START_FRACTION = 0.1;
const BUILD_STAGGER_STEP = 0.06;
const MORPH_DURATION_SEC = 0.45;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const RADAR_LABELS = [
  { text: 'Logique', x: 85, y: 9, anchor: 'middle' },
  { text: 'Mémoire', x: 135, y: 46, anchor: 'start' },
  { text: 'Discri.', x: 116, y: 113, anchor: 'start' },
  { text: 'Réacti.', x: 54, y: 113, anchor: 'end' },
  { text: 'Motricité', x: 35, y: 46, anchor: 'end' },
] as const;

@Component({
  selector: 'ui-axis-radar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="radar"
      [class.radar--outlined]="outlined()"
      [attr.viewBox]="'0 0 ' + viewWidth + ' ' + viewHeight"
      role="img"
      aria-label="Profil par axe"
    >
      @for (mesh of meshPolygons; track mesh) {
        <polygon class="radar__mesh" [attr.points]="mesh" />
      }
      @for (ray of rays; track ray.x) {
        <line
          class="radar__ray"
          [attr.x1]="centerX"
          [attr.y1]="centerY"
          [attr.x2]="ray.x"
          [attr.y2]="ray.y"
        />
      }
      @if (baselinePoints(); as points) {
        <polygon class="radar__baseline" [attr.points]="points" />
      }
      <polygon class="radar__area" [attr.points]="areaPoints()" />
      @for (vertex of vertices(); track $index) {
        <circle
          class="radar__dot"
          [attr.cx]="vertex.x"
          [attr.cy]="vertex.y"
          r="2.6"
          [attr.fill]="vertex.colorVar"
        />
      }
      @for (label of labels; track label.text) {
        <text
          class="radar__label"
          [attr.x]="label.x"
          [attr.y]="label.y"
          [attr.text-anchor]="label.anchor"
        >
          {{ label.text }}
        </text>
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
      width: 252px;
    }
    .radar {
      display: block;
      width: 100%;
      height: auto;
      overflow: visible;
    }
    .radar__mesh {
      fill: none;
      stroke: var(--border);
      stroke-width: 1;
      vector-effect: non-scaling-stroke;
    }
    .radar__ray {
      stroke: var(--border);
      stroke-width: 1;
      vector-effect: non-scaling-stroke;
    }
    .radar__baseline {
      fill: color-mix(in srgb, var(--label) 10%, transparent);
      stroke: var(--label);
      stroke-width: 1.5;
      stroke-linejoin: round;
      stroke-dasharray: 3 3;
      vector-effect: non-scaling-stroke;
    }
    .radar__area {
      fill: color-mix(in srgb, var(--brand) 13%, transparent);
      stroke: var(--brand);
      stroke-width: 1.5;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }
    .radar--outlined .radar__baseline,
    .radar--outlined .radar__area {
      fill: none;
    }
    .radar__dot {
      stroke: var(--card);
      stroke-width: 0.8;
    }
    .radar__label {
      font: 400 7px var(--font-ui);
      fill: var(--label);
    }
    @media (max-width: 767px) {
      :host {
        width: 260px;
      }
    }
  `,
})
export class AxisRadar {
  readonly entries = input.required<readonly AxisRadarEntry[]>();
  readonly baseline = input<readonly AxisRadarEntry[]>([]);
  readonly progress = input(1);
  readonly outlined = input(false);

  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  // Scores réellement dessinés. Ils rejoignent ceux de `entries` en glissant,
  // pour qu'un changement de jeu de données déforme le polygone au lieu de le
  // remplacer d'un coup.
  private readonly drawnScores = signal<number[]>([]);
  private stopMorph: (() => void) | null = null;
  private pendingScores: number[] | null = null;

  constructor() {
    effect(() => {
      const target = this.entries().map((entry) => entry.score);
      const drawn = untracked(this.drawnScores);
      if (drawn.length !== target.length || !this.canMorph()) {
        this.settleOn(target);
        return;
      }
      if (target.every((score, index) => score === drawn[index])) {
        return;
      }
      this.morph(drawn, target);
    });
    this.watchVisibility();
    this.destroyRef.onDestroy(() => this.stopMorph?.());
  }

  // Une animation ne doit jamais retenir la donnée : dès que l'onglet passe en
  // arrière-plan, les frames s'arrêtent et le polygone resterait figé sur le
  // jeu précédent, donc sur un profil faux. On le pose alors d'un coup.
  private watchVisibility(): void {
    if (typeof this.document.addEventListener !== 'function') {
      return;
    }
    const onVisibilityChange = (): void => {
      if (this.document.visibilityState === 'hidden' && this.pendingScores) {
        this.settleOn(this.pendingScores);
      }
    };
    this.document.addEventListener('visibilitychange', onVisibilityChange);
    this.destroyRef.onDestroy(() =>
      this.document.removeEventListener('visibilitychange', onVisibilityChange),
    );
  }

  private canMorph(): boolean {
    const view = this.document.defaultView;
    if (typeof view?.matchMedia !== 'function') {
      return false;
    }
    if (this.document.visibilityState === 'hidden') {
      return false;
    }
    return !view.matchMedia(REDUCED_MOTION_QUERY).matches;
  }

  private settleOn(scores: number[]): void {
    this.stopMorph?.();
    this.stopMorph = null;
    this.pendingScores = null;
    this.drawnScores.set(scores);
  }

  private morph(from: number[], to: number[]): void {
    this.stopMorph?.();
    this.pendingScores = to;
    try {
      const controls = animate(0, 1, {
        duration: MORPH_DURATION_SEC,
        ease: [0.22, 1, 0.36, 1],
        onUpdate: (fraction: number) =>
          this.drawnScores.set(
            from.map((score, index) => score + (to[index] - score) * fraction),
          ),
        onComplete: () => this.settleOn(to),
      });
      this.stopMorph = () => controls.stop();
    } catch {
      this.settleOn(to);
    }
  }

  protected readonly viewWidth = VIEW_WIDTH;
  protected readonly viewHeight = VIEW_HEIGHT;
  protected readonly centerX = CENTER_X;
  protected readonly centerY = CENTER_Y;
  protected readonly labels = RADAR_LABELS;

  protected readonly meshPolygons = MESH_LEVELS.map((level) =>
    polygonPoints((index) => pointAt(index, level)),
  );

  protected readonly rays = Array.from({ length: 5 }, (_, index) =>
    pointAt(index, 1),
  );

  protected readonly areaPoints = computed(() =>
    polygonPoints((index) =>
      pointAt(index, this.builtFraction(this.drawnScores()[index] ?? 0, index)),
    ),
  );

  protected readonly baselinePoints = computed(() =>
    this.baseline().length === 0
      ? null
      : polygonPoints((index) =>
          pointAt(index, (this.baseline()[index]?.score ?? 0) / 100),
        ),
  );

  protected readonly vertices = computed<RadarVertex[]>(() =>
    this.entries().map((entry, index) => ({
      ...pointAt(
        index,
        this.builtFraction(this.drawnScores()[index] ?? entry.score, index),
      ),
      colorVar: AXIS_PRESENTATION[entry.axis].plainVar,
    })),
  );

  private builtFraction(score: number, index: number): number {
    const target = score / 100;
    const raw = this.progress();
    if (raw >= 1) {
      return target;
    }
    const count = this.entries().length;
    const spread = 1 + (count - 1) * BUILD_STAGGER_STEP;
    const staggered = Math.min(
      1,
      Math.max(0, raw * spread - index * BUILD_STAGGER_STEP),
    );
    return BUILD_START_FRACTION + (target - BUILD_START_FRACTION) * staggered;
  }
}

function pointAt(index: number, fraction: number): RadarPoint {
  const angle = (index * 2 * Math.PI) / 5;
  return {
    x: roundToTenth(CENTER_X + RADIUS * fraction * Math.sin(angle)),
    y: roundToTenth(CENTER_Y - RADIUS * fraction * Math.cos(angle)),
  };
}

function polygonPoints(pointFor: (index: number) => RadarPoint): string {
  return Array.from({ length: 5 }, (_, index) => pointFor(index))
    .map(({ x, y }) => `${x},${y}`)
    .join(' ');
}
