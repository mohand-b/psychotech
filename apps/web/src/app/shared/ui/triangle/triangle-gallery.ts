import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  TriangleItem,
  TriangleLevel,
  generateTriangleItem,
} from '@psychotech/shared';
import { triangleAnnotations } from './triangle-lab';
import { TriangleSeries } from './triangle-series';

interface GalleryRow {
  label: string;
  item: TriangleItem | null;
}

const LEVELS: readonly TriangleLevel[] = [1, 2, 3, 4, 5];

@Component({
  selector: 'app-triangle-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TriangleSeries],
  template: `
    <div class="gallery">
      @for (row of rows(); track row.label) {
        <div class="row">
          <span class="row__label">{{ row.label }}</span>
          @if (row.item; as item) {
            <ui-triangle-series
              [triangles]="item.triangles"
              [missing]="item.missing"
              [answerValue]="item.answer"
              [annotations]="annotationsFor(item)"
              [tileSize]="84"
            />
            <span class="row__rule">{{ item.rule.userText }}</span>
          } @else {
            <span class="row__error">Génération impossible</span>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .gallery {
      display: flex;
      flex-direction: column;
      gap: 18px;
      max-width: 900px;
    }
    .row {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      background: var(--bg);
      border-radius: 10px;
    }
    .row__label {
      font: 700 13px/18px var(--font-ui);
      color: var(--ink);
    }
    .row__rule {
      font: 400 12px/16px var(--font-ui);
      color: var(--text-secondary);
    }
    .row__error {
      font: 600 12px/16px var(--font-ui);
      color: var(--danger-text);
    }
  `,
})
export class TriangleGallery {
  readonly seed = input('galerie');

  protected readonly rows = computed<GalleryRow[]>(() =>
    LEVELS.map((level) => {
      let item: TriangleItem | null;
      try {
        item = generateTriangleItem({ level, seed: this.seed() });
      } catch {
        item = null;
      }
      return { label: `Niveau ${level}`, item };
    }),
  );

  protected annotationsFor(item: TriangleItem): string[] {
    return triangleAnnotations(item);
  }
}
