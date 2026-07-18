import { TestBed } from '@angular/core/testing';
import {
  MATRIX_COUNT_SCALE,
  MATRIX_DECORS,
  MATRIX_FIGURE_ELEMENTS,
  MATRIX_FILL_SCALE,
  MATRIX_ROTATION_SCALE,
  MATRIX_SIZE_SCALE,
  MATRIX_STROKE_COUNT_SCALE,
  MATRIX_STROKE_ELEMENTS,
  MATRIX_STROKE_TYPES,
  MATRIX_SYMBOLS,
  MatrixCellSpec,
  MatrixContainer,
  MatrixDecor,
  MatrixRegister,
  MatrixStructure,
  MatrixSymbol,
  createCompositionCell,
  createDefaultMatrixCell,
  createDefaultStrokeCell,
  generateMatrixItem,
} from '@psychotech/shared';
import { MatrixCell } from './matrix-cell';
import { MatrixChoices } from './matrix-choices';
import { MatrixGrid } from './matrix-grid';

const ALL_CONTAINERS = [
  MatrixContainer.NONE,
  MatrixContainer.CIRCLE,
  MatrixContainer.SQUARE,
  MatrixContainer.DOUBLE_SQUARE,
];

async function renderCell(cell: MatrixCellSpec): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(MatrixCell);
  fixture.componentRef.setInput('cell', cell);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('MatrixCell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatrixCell, MatrixGrid, MatrixChoices],
    }).compileComponents();
  });

  it('rend chaque symbole avec chaque remplissage', async () => {
    for (const symbol of MATRIX_SYMBOLS) {
      for (const fill of MATRIX_FILL_SCALE) {
        const element = await renderCell({
          ...createDefaultMatrixCell(symbol),
          fill,
        });
        expect(element.querySelector('svg')).not.toBeNull();
        expect(
          element.querySelectorAll('polygon, circle.glyph').length,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('rend chaque conteneur et chaque décor', async () => {
    for (const container of ALL_CONTAINERS) {
      for (const decor of MATRIX_DECORS) {
        const element = await renderCell({
          ...createDefaultMatrixCell(MatrixSymbol.STAR),
          container,
          decor,
        });
        expect(element.querySelector('svg')).not.toBeNull();
      }
    }
  });

  it('rend chaque taille, rotation et nombre', async () => {
    for (const size of MATRIX_SIZE_SCALE) {
      for (const rotation of MATRIX_ROTATION_SCALE) {
        for (const count of MATRIX_COUNT_SCALE) {
          const element = await renderCell({
            ...createDefaultMatrixCell(MatrixSymbol.TRIANGLE),
            size,
            rotation,
            count,
          });
          expect(element.querySelectorAll('polygon')).toHaveLength(count);
        }
      }
    }
  });

  it('rend chaque famille de traits avec chaque nombre', async () => {
    for (const strokeAType of MATRIX_STROKE_TYPES) {
      for (const count of MATRIX_STROKE_COUNT_SCALE) {
        const strokeBType = MATRIX_STROKE_TYPES.find(
          (candidate) => candidate !== strokeAType,
        );
        const element = await renderCell({
          ...createDefaultStrokeCell(
            strokeAType,
            strokeBType ?? strokeAType,
          ),
          strokeACount: count,
        });
        expect(element.querySelectorAll('path.stroke-path').length).toBe(
          count + 1,
        );
      }
    }
  });

  it('rend chaque élément de composition dans les deux registres', async () => {
    for (const [register, palette] of [
      [MatrixRegister.FIGURES, MATRIX_FIGURE_ELEMENTS],
      [MatrixRegister.TRAITS, MATRIX_STROKE_ELEMENTS],
    ] as const) {
      for (const atom of palette) {
        const element = await renderCell(
          createCompositionCell(register, [atom], false),
        );
        expect(element.querySelectorAll('path.stroke-path')).toHaveLength(1);
      }
    }
  });

  it('rend une pile emboîtée avec une échelle par profondeur', async () => {
    const element = await renderCell(
      createCompositionCell(
        MatrixRegister.FIGURES,
        MATRIX_FIGURE_ELEMENTS.slice(0, 4),
        true,
      ),
    );
    const paths = element.querySelectorAll('path.stroke-path');
    expect(paths).toHaveLength(4);
    expect(paths[0].getAttribute('transform')).toBeNull();
    expect(paths[1].getAttribute('transform')).toContain('scale(0.78)');
  });

  it('rend une grille générée avec la neuvième case en mystère', () => {
    const item = generateMatrixItem({
      structure: MatrixStructure.CROSSED,
      level: 5,
      seed: 'smoke',
    });
    const fixture = TestBed.createComponent(MatrixGrid);
    fixture.componentRef.setInput('cells', item.cells);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('ui-matrix-cell')).toHaveLength(8);
    expect(element.querySelector('.slot--mystery')?.textContent).toContain('?');
  });

  it('rend les six propositions cliquables', () => {
    const item = generateMatrixItem({
      structure: MatrixStructure.DISTRIBUTION,
      level: 4,
      seed: 'smoke',
    });
    const fixture = TestBed.createComponent(MatrixChoices);
    fixture.componentRef.setInput(
      'cells',
      item.proposals.map((proposal) => proposal.cell),
    );
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('button.choice')).toHaveLength(6);
  });
});
