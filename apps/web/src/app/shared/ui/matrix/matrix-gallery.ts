import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  MatrixItem,
  MatrixLevel,
  MatrixStructure,
  generateMatrixItem,
} from '@psychotech/shared';
import { MatrixGrid } from './matrix-grid';

interface GalleryEntry {
  label: string;
  item: MatrixItem | null;
}

const LEVELS: readonly MatrixLevel[] = [1, 2, 3, 4, 5];

const STRUCTURE_LABELS: Record<MatrixStructure, string> = {
  [MatrixStructure.CROSSED]: 'Croisées',
  [MatrixStructure.DISTRIBUTION]: 'Distribution',
};

@Component({
  selector: 'app-matrix-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatrixGrid],
  template: `
    <div class="gallery">
      @for (entry of entries(); track entry.label) {
        <div class="tile">
          <span class="tile__label">{{ entry.label }}</span>
          @if (entry.item; as item) {
            <ui-matrix-grid
              [cells]="item.cells"
              [showAnswer]="true"
              [cellSize]="46"
            />
            <span class="tile__rule">{{ item.rule.userText }}</span>
          } @else {
            <span class="tile__error">Génération impossible</span>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .gallery {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 16px;
      max-width: 1240px;
    }
    .tile {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      background: var(--bg);
      border-radius: 10px;
    }
    .tile__label {
      font: 700 12px/16px var(--font-ui);
      color: var(--ink);
    }
    .tile__rule {
      font: 400 11px/15px var(--font-ui);
      color: var(--text-secondary);
    }
    .tile__error {
      font: 600 12px/16px var(--font-ui);
      color: var(--danger-text);
    }
  `,
})
export class MatrixGallery {
  readonly seed = input('galerie');

  protected readonly entries = computed<GalleryEntry[]>(() =>
    Object.values(MatrixStructure).flatMap((structure) =>
      LEVELS.map((level) => {
        let item: MatrixItem | null;
        try {
          item = generateMatrixItem({
            structure,
            level,
            seed: this.seed(),
          });
        } catch {
          item = null;
        }
        return {
          label: `${STRUCTURE_LABELS[structure]} — N${level}`,
          item,
        };
      }),
    ),
  );
}
