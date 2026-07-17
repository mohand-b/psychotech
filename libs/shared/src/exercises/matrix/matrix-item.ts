import {
  MatrixCellSpec,
  MatrixLayerKind,
  MatrixLevel,
  MatrixStructure,
} from './matrix-cell';

export enum MatrixProposalKind {
  CORRECT = 'CORRECT',
  WRONG_LAYER_A = 'WRONG_LAYER_A',
  WRONG_LAYER_B = 'WRONG_LAYER_B',
  GRID_DUPLICATE = 'GRID_DUPLICATE',
  WRONG_STEP = 'WRONG_STEP',
  WRONG_AXIS = 'WRONG_AXIS',
}

export interface MatrixProposal {
  cell: MatrixCellSpec;
  kind: MatrixProposalKind;
}

export interface MatrixRule {
  id: string;
  userText: string;
}

export type MatrixRuleSpec =
  | {
      structure: MatrixStructure.CROSSED;
      rowLayer: MatrixLayerKind;
      colLayer: MatrixLayerKind;
      progressionLayer: MatrixLayerKind | null;
    }
  | {
      structure: MatrixStructure.DISTRIBUTION;
      latinLayers: readonly MatrixLayerKind[];
    };

export interface MatrixItem {
  structure: MatrixStructure;
  level: MatrixLevel;
  seed: string;
  cells: readonly MatrixCellSpec[];
  proposals: readonly MatrixProposal[];
  rule: MatrixRule;
  ruleSpec: MatrixRuleSpec;
  activeLayers: readonly MatrixLayerKind[];
}
