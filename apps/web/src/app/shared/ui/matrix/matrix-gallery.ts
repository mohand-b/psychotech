import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  MATRIX_CATALOG,
  MatrixItem,
  generateMatrixItemFromCatalog,
} from '@psychotech/shared';
import { MatrixGrid } from './matrix-grid';

interface GalleryRow {
  label: string;
  items: (MatrixItem | null)[];
}

const SEED_SUFFIXES = ['', '-b', '-c'];

@Component({
  selector: 'app-matrix-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatrixGrid],
  template: `
    <div class="gallery">
      @for (row of rows(); track row.label) {
        <div class="row">
          <span class="row__label">{{ row.label }}</span>
          <div class="row__grids">
            @for (item of row.items; track $index) {
              @if (item) {
                <ui-matrix-grid
                  [cells]="item.cells"
                  [showAnswer]="true"
                  [cellSize]="46"
                />
              } @else {
                <span class="row__error">Génération impossible</span>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .gallery {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 1240px;
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
    .row__grids {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    .row__error {
      font: 600 12px/16px var(--font-ui);
      color: var(--danger-text);
    }
  `,
})
export class MatrixGallery {
  readonly seed = input('galerie');

  protected readonly rows = computed<GalleryRow[]>(() =>
    MATRIX_CATALOG.map((entry) => ({
      label: entry.label,
      items: SEED_SUFFIXES.map((suffix) => {
        try {
          return generateMatrixItemFromCatalog(
            entry.id,
            `${this.seed()}${suffix}`,
          );
        } catch {
          return null;
        }
      }),
    })),
  );
}
