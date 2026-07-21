import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  AxisType,
  MOTRICITY_CANVAS_HEIGHT,
  MOTRICITY_CANVAS_WIDTH,
  MOTRICITY_CURSOR_RADIUS,
  MotricityCourse,
  MotricityPoint,
} from '@psychotech/shared';
import { AXIS_PRESENTATION } from '../axis-presentation';

const BADGE_WIDTH = 58;
const BADGE_HEIGHT = 24;

function formatPoints(points: readonly MotricityPoint[]): string {
  return points
    .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(' ');
}

@Component({
  selector: 'ui-motricity-course-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--axis-plain]': 'presentation.plainVar',
    '[style.--axis-pastel]': 'presentation.pastelVar',
    '[style.--axis-pastel-bd]': 'presentation.pastelBorderVar',
    '[style.--axis-text]': 'presentation.textVar',
  },
  template: `
    <svg
      class="preview"
      [attr.viewBox]="'0 0 ' + canvasWidth + ' ' + canvasHeight"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect
        class="preview__zone"
        [attr.x]="course().garage.x"
        [attr.y]="course().garage.y"
        [attr.width]="course().garage.width"
        [attr.height]="course().garage.height"
      />
      <rect
        class="preview__zone"
        [attr.x]="course().endZone.x"
        [attr.y]="course().endZone.y"
        [attr.width]="course().endZone.width"
        [attr.height]="course().endZone.height"
      />
      <polygon class="preview__corridor" [attr.points]="polygonPoints()" />
      <polyline class="preview__border" [attr.points]="leftSidePoints()" />
      <polyline class="preview__border" [attr.points]="rightSidePoints()" />
      <polyline class="preview__centerline" [attr.points]="centerlinePoints()" />
      @for (wall of course().garageWalls; track $index) {
        <line
          class="preview__wall"
          [attr.x1]="wall.start.x"
          [attr.y1]="wall.start.y"
          [attr.x2]="wall.end.x"
          [attr.y2]="wall.end.y"
        />
      }
      <g
        [attr.transform]="
          'translate(' +
          course().garage.x +
          ',' +
          (course().garage.y + course().garage.height + 12) +
          ')'
        "
      >
        <rect
          class="preview__badge preview__badge--start"
          [attr.width]="badgeWidth"
          [attr.height]="badgeHeight"
          rx="7"
        />
        <text
          class="preview__badge-text preview__badge-text--start"
          [attr.x]="badgeWidth / 2"
          [attr.y]="badgeHeight / 2 + 4"
        >
          START
        </text>
      </g>
      <g
        [attr.transform]="
          'translate(' +
          (course().endZone.x + course().endZone.width - badgeWidth) +
          ',' +
          (course().endZone.y - badgeHeight - 12) +
          ')'
        "
      >
        <rect
          class="preview__badge preview__badge--end"
          [attr.width]="badgeWidth"
          [attr.height]="badgeHeight"
          rx="7"
        />
        <text
          class="preview__badge-text preview__badge-text--end"
          [attr.x]="badgeWidth / 2"
          [attr.y]="badgeHeight / 2 + 4"
        >
          END
        </text>
      </g>
      <circle
        class="preview__cursor"
        [attr.cx]="course().startPosition.x"
        [attr.cy]="course().startPosition.y"
        [attr.r]="cursorRadius"
      />
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    .preview {
      display: block;
      width: 100%;
      height: auto;
    }
    .preview__zone {
      fill: var(--surface-muted);
    }
    .preview__corridor {
      fill: var(--surface-muted);
    }
    .preview__border {
      fill: none;
      stroke: var(--border-hover);
      stroke-width: 1.5;
    }
    .preview__centerline {
      fill: none;
      stroke: var(--border-hover);
      stroke-width: 2;
      stroke-dasharray: 7 7;
    }
    .preview__wall {
      stroke: var(--text-secondary);
      stroke-width: 3;
      stroke-linecap: square;
    }
    .preview__badge--start {
      fill: var(--secondary-pastel);
      stroke: var(--secondary-pastel-bd);
    }
    .preview__badge--end {
      fill: var(--axis-pastel);
      stroke: var(--axis-pastel-bd);
    }
    .preview__badge-text {
      font: 700 12px/1 var(--font-ui);
      letter-spacing: 0.06em;
      text-anchor: middle;
    }
    .preview__badge-text--start {
      fill: var(--secondary-label);
    }
    .preview__badge-text--end {
      fill: var(--axis-text);
    }
    .preview__cursor {
      fill: var(--axis-plain);
      stroke: var(--axis-pastel-bd);
      stroke-width: 5;
    }
  `,
})
export class MotricityCoursePreview {
  readonly course = input.required<MotricityCourse>();

  protected readonly presentation = AXIS_PRESENTATION[AxisType.MOTOR_SKILLS];
  protected readonly canvasWidth = MOTRICITY_CANVAS_WIDTH;
  protected readonly canvasHeight = MOTRICITY_CANVAS_HEIGHT;
  protected readonly cursorRadius = MOTRICITY_CURSOR_RADIUS;
  protected readonly badgeWidth = BADGE_WIDTH;
  protected readonly badgeHeight = BADGE_HEIGHT;

  protected readonly polygonPoints = computed(() =>
    formatPoints(this.course().polygon),
  );
  protected readonly leftSidePoints = computed(() =>
    formatPoints(this.course().leftSide),
  );
  protected readonly rightSidePoints = computed(() =>
    formatPoints(this.course().rightSide),
  );
  protected readonly centerlinePoints = computed(() =>
    formatPoints(this.course().centerline),
  );
}
