import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { AxisType } from '@psychotech/shared';
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

interface RadarLabel extends RadarPoint {
  text: string;
  anchor: 'start' | 'middle' | 'end';
}

const VIEW_SIZE = 240;
const CENTER = VIEW_SIZE / 2;
const RADIUS = 88;
const LABEL_RADIUS = RADIUS + 18;
const MESH_LEVELS = [1 / 3, 2 / 3, 1];

const RADAR_LABELS: Partial<Record<AxisType, string>> = {
  [AxisType.VISUAL_DISCRIMINATION]: 'Discri.',
  [AxisType.REACTIVITY]: 'Réacti.',
};

@Component({
  selector: 'ui-axis-radar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="radar"
      [attr.viewBox]="'0 0 ' + viewSize + ' ' + viewSize"
      role="img"
      aria-label="Profil par axe"
    >
      @for (mesh of meshPolygons; track mesh) {
        <polygon class="radar__mesh" [attr.points]="mesh" />
      }
      @for (ray of rays; track ray.x) {
        <line
          class="radar__ray"
          [attr.x1]="center"
          [attr.y1]="center"
          [attr.x2]="ray.x"
          [attr.y2]="ray.y"
        />
      }
      <polygon class="radar__area" [attr.points]="areaPoints()" />
      @for (vertex of vertices(); track vertex.colorVar) {
        <circle
          class="radar__dot"
          [attr.cx]="vertex.x"
          [attr.cy]="vertex.y"
          r="2.5"
          [attr.fill]="vertex.colorVar"
        />
      }
      @for (label of labels(); track label.text) {
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
      width: 16.75rem;
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
    }
    .radar__ray {
      stroke: var(--divider-soft);
      stroke-width: 1;
    }
    .radar__area {
      fill: var(--brand-pastel-bd);
      fill-opacity: 0.55;
      stroke: var(--brand);
      stroke-width: 2;
      stroke-linejoin: round;
    }
    .radar__label {
      font: 500 11px var(--font-ui);
      fill: var(--text-secondary);
    }
    @media (max-width: 767px) {
      :host {
        width: 18.125rem;
      }
    }
  `,
})
export class AxisRadar {
  readonly entries = input.required<readonly AxisRadarEntry[]>();

  protected readonly viewSize = VIEW_SIZE;
  protected readonly center = CENTER;

  protected readonly meshPolygons = MESH_LEVELS.map((level) =>
    polygonPoints((index) => pointAt(index, level)),
  );

  protected readonly rays = Array.from({ length: 5 }, (_, index) =>
    pointAt(index, 1),
  );

  protected readonly areaPoints = computed(() =>
    polygonPoints((index) =>
      pointAt(index, (this.entries()[index]?.score ?? 0) / 100),
    ),
  );

  protected readonly vertices = computed<RadarVertex[]>(() =>
    this.entries().map((entry, index) => ({
      ...pointAt(index, entry.score / 100),
      colorVar: AXIS_PRESENTATION[entry.axis].plainVar,
    })),
  );

  protected readonly labels = computed<RadarLabel[]>(() =>
    this.entries().map((entry, index) => {
      const point = pointAt(index, LABEL_RADIUS / RADIUS);
      const cos = Math.cos(angleFor(index));
      return {
        x: point.x,
        y: point.y + 4,
        text:
          RADAR_LABELS[entry.axis] ?? AXIS_PRESENTATION[entry.axis].label,
        anchor: cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle',
      };
    }),
  );
}

function angleFor(index: number): number {
  return ((-90 + index * 72) * Math.PI) / 180;
}

function pointAt(index: number, fraction: number): RadarPoint {
  const angle = angleFor(index);
  return {
    x: round2(CENTER + Math.cos(angle) * RADIUS * fraction),
    y: round2(CENTER + Math.sin(angle) * RADIUS * fraction),
  };
}

function polygonPoints(pointFor: (index: number) => RadarPoint): string {
  return Array.from({ length: 5 }, (_, index) => pointFor(index))
    .map(({ x, y }) => `${x},${y}`)
    .join(' ');
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
