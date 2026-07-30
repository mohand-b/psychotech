import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { MotricityCourse, generateMotricityCourses } from '@psychotech/shared';
import { MotricityCoursePreview } from './motricity-course-preview';

const LEVEL_SHAPES: readonly string[] = [
  'Simple',
  'Intermédiaire',
  'Serpentin',
];

interface MotricityLabEntry {
  course: MotricityCourse;
  title: string;
  meta: string;
}

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

@Component({
  selector: 'app-motricity-lab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MotricityCoursePreview],
  template: `
    <div class="lab">
      <div class="lab__controls">
        <button type="button" class="lab__generate" (click)="generate()">
          Générer
        </button>
        <label class="lab__field">
          <span class="lab__field-label">Seed</span>
          <input
            class="lab__seed t-mono"
            [value]="seed()"
            (input)="seed.set($any($event.target).value)"
          />
        </label>
        <button type="button" class="lab__chip" (click)="copySeed()">
          Copier la seed
        </button>
      </div>

      @if (entries(); as list) {
        @for (entry of list; track entry.course.index) {
          <div class="lab__course">
            <div class="lab__course-head">
              <span class="lab__course-title">{{ entry.title }}</span>
              <span class="t-mono lab__course-meta">{{ entry.meta }}</span>
            </div>
            <ui-motricity-course-preview [course]="entry.course" />
          </div>
        }
      } @else {
        <p class="lab__error">Génération impossible — à consigner.</p>
      }
    </div>
  `,
  styleUrls: ['../lab-toolbar.css'],
  styles: `
    .lab {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 20px;
      background: var(--bg);
      border-radius: 12px;
      max-width: 900px;
    }
    .lab__course {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 14px 16px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
    }
    .lab__course-head {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 10px;
    }
    .lab__course-title {
      font: 700 14px/18px var(--font-ui);
      color: var(--ink);
    }
    .lab__course-meta {
      font-size: 11px;
      color: var(--label);
    }
    .lab__error {
      font: 600 14px/20px var(--font-ui);
      color: var(--danger-text);
    }
  `,
})
export class MotricityLab {
  protected readonly seed = signal(randomSeed());

  protected readonly entries = computed<MotricityLabEntry[] | null>(() => {
    try {
      return generateMotricityCourses(this.seed()).map((course) => {
        const widths = course.segments.map((segment) => segment.width);
        return {
          course,
          title: `Niveau ${course.index + 1} · ${LEVEL_SHAPES[course.index] ?? 'Parcours'}`,
          meta: `largeur ${Math.round(widths[0])} → ${Math.round(widths[widths.length - 1])} · ${course.segments.length} segments · longueur ${Math.round(course.totalLength)} · seed ${this.seed()}`,
        };
      });
    } catch {
      return null;
    }
  });

  protected generate(): void {
    this.seed.set(randomSeed());
  }

  protected copySeed(): void {
    void navigator.clipboard?.writeText(this.seed()).catch(() => undefined);
  }
}
