import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  MatrixCompositionVariant,
  MatrixItem,
  MatrixLevel,
  MatrixRegister,
  MatrixStructure,
  generateMatrixItem,
} from '@psychotech/shared';
import { MatrixGrid } from './matrix-grid';

interface GalleryEntry {
  label: string;
  item: MatrixItem | null;
}

interface GallerySection {
  title: string;
  entries: GalleryEntry[];
}

interface GalleryStructureCase {
  label: string;
  structure: MatrixStructure;
  variant?: MatrixCompositionVariant;
}

const LEVELS: readonly MatrixLevel[] = [1, 2, 3, 4, 5];

const STRUCTURE_CASES: readonly GalleryStructureCase[] = [
  { label: 'Croisées', structure: MatrixStructure.CROSSED },
  { label: 'Distribution', structure: MatrixStructure.DISTRIBUTION },
  {
    label: 'Addition',
    structure: MatrixStructure.COMPOSITION,
    variant: MatrixCompositionVariant.ADDITION,
  },
  {
    label: 'Soustraction',
    structure: MatrixStructure.COMPOSITION,
    variant: MatrixCompositionVariant.SOUSTRACTION,
  },
  {
    label: 'Emboîtement',
    structure: MatrixStructure.COMPOSITION,
    variant: MatrixCompositionVariant.EMBOITEMENT,
  },
];

const REGISTER_TITLES: Record<MatrixRegister, string> = {
  [MatrixRegister.FIGURES]: 'Registre figures',
  [MatrixRegister.TRAITS]: 'Registre traits',
};

@Component({
  selector: 'app-matrix-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatrixGrid],
  template: `
    <div class="gallery">
      @for (section of sections(); track section.title) {
        <div class="section">
          <h3 class="section__title">{{ section.title }}</h3>
          <div class="section__grid">
            @for (entry of section.entries; track entry.label) {
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
        </div>
      }
    </div>
  `,
  styles: `
    .gallery {
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 1240px;
    }
    .section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .section__title {
      margin: 0;
      font: 700 15px/20px var(--font-ui);
      color: var(--ink);
    }
    .section__grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 16px;
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

  protected readonly sections = computed<GallerySection[]>(() =>
    Object.values(MatrixRegister).map((register) => ({
      title: REGISTER_TITLES[register],
      entries: STRUCTURE_CASES.flatMap((structureCase) =>
        LEVELS.map((level) => {
          let item: MatrixItem | null;
          try {
            item = generateMatrixItem({
              structure: structureCase.structure,
              variant: structureCase.variant,
              register,
              level,
              seed: this.seed(),
            });
          } catch {
            item = null;
          }
          return {
            label: `${structureCase.label} — N${level}`,
            item,
          };
        }),
      ),
    })),
  );
}
