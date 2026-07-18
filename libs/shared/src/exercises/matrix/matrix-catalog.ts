import {
  MatrixCompositionVariant,
  MatrixLevel,
  MatrixRegister,
  MatrixStructure,
} from './matrix-cell';
import { generateMatrixItem } from './generate-matrix-item';
import { MatrixItem } from './matrix-item';

export interface MatrixCatalogEntry {
  id: string;
  label: string;
  structure: MatrixStructure;
  register: MatrixRegister;
  variant: MatrixCompositionVariant | null;
  recipeLevel: MatrixLevel;
}

export const MATRIX_CATALOG: readonly MatrixCatalogEntry[] = [
  {
    id: 'soustraction-figures',
    label: 'Soustraction — figures',
    structure: MatrixStructure.COMPOSITION,
    register: MatrixRegister.FIGURES,
    variant: MatrixCompositionVariant.SOUSTRACTION,
    recipeLevel: 1,
  },
  {
    id: 'soustraction-traits',
    label: 'Soustraction — traits',
    structure: MatrixStructure.COMPOSITION,
    register: MatrixRegister.TRAITS,
    variant: MatrixCompositionVariant.SOUSTRACTION,
    recipeLevel: 1,
  },
  {
    id: 'addition-traits',
    label: 'Addition — traits',
    structure: MatrixStructure.COMPOSITION,
    register: MatrixRegister.TRAITS,
    variant: MatrixCompositionVariant.ADDITION,
    recipeLevel: 1,
  },
  {
    id: 'croisees-traits-nombres',
    label: 'Croisées — nombres de traits',
    structure: MatrixStructure.CROSSED,
    register: MatrixRegister.TRAITS,
    variant: null,
    recipeLevel: 1,
  },
  {
    id: 'croisees-figures-decor',
    label: 'Croisées — symbole et décor',
    structure: MatrixStructure.CROSSED,
    register: MatrixRegister.FIGURES,
    variant: null,
    recipeLevel: 2,
  },
  {
    id: 'croisees-traits-nature-nombre',
    label: 'Croisées — nature et nombre de traits',
    structure: MatrixStructure.CROSSED,
    register: MatrixRegister.TRAITS,
    variant: null,
    recipeLevel: 4,
  },
  {
    id: 'distribution-figures-triple',
    label: 'Distribution — triple couche',
    structure: MatrixStructure.DISTRIBUTION,
    register: MatrixRegister.FIGURES,
    variant: null,
    recipeLevel: 4,
  },
];

export function generateMatrixItemFromCatalog(
  catalogId: string,
  seed: string,
): MatrixItem {
  const entry = MATRIX_CATALOG.find((candidate) => candidate.id === catalogId);
  if (!entry) {
    throw new Error(`Unknown matrix catalog entry ${catalogId}`);
  }
  return generateMatrixItem({
    structure: entry.structure,
    register: entry.register,
    variant: entry.variant ?? undefined,
    level: entry.recipeLevel,
    seed,
  });
}
