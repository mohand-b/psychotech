import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import {
  MATRIX_CATALOG,
  MatrixItem,
  MatrixProposalKind,
  MatrixRegister,
  generateMatrixItemFromCatalog,
} from '@psychotech/shared';
import { MatrixChoiceAnnotation, MatrixChoices } from './matrix-choices';
import { MatrixGrid } from './matrix-grid';

const PROPOSAL_KIND_LABELS: Record<MatrixProposalKind, string> = {
  [MatrixProposalKind.CORRECT]: 'Bonne réponse',
  [MatrixProposalKind.WRONG_LAYER_A]: 'Bonne couche B, mauvaise couche A',
  [MatrixProposalKind.WRONG_LAYER_B]: 'Bonne couche A, mauvaise couche B',
  [MatrixProposalKind.GRID_DUPLICATE]: 'Case déjà présente dans la grille',
  [MatrixProposalKind.WRONG_STEP]: 'Progression au mauvais pas',
  [MatrixProposalKind.WRONG_AXIS]: 'Règle lue sur le mauvais axe',
  [MatrixProposalKind.MISSING_ELEMENT]: 'Superposition avec un élément manquant',
  [MatrixProposalKind.EXTRA_ELEMENT]: 'Élément parasite',
  [MatrixProposalKind.FIRST_CELL_ONLY]: 'Première case seule',
  [MatrixProposalKind.WRONG_LAYER_REMOVED]: 'Mauvaise couche retirée',
};

const REGISTER_LABELS: Record<MatrixRegister, string> = {
  [MatrixRegister.FIGURES]: 'figures',
  [MatrixRegister.TRAITS]: 'traits',
};

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

@Component({
  selector: 'app-matrix-lab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatrixChoices, MatrixGrid],
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
            (input)="onSeedInput($any($event.target).value)"
          />
        </label>
        <button type="button" class="lab__chip" (click)="copySeed()">
          Copier la seed
        </button>
        <button
          type="button"
          class="lab__chip lab__chip--reveal"
          [class.lab__chip--active]="revealed()"
          (click)="revealed.set(!revealed())"
        >
          Révéler
        </button>
      </div>

      <div class="lab__controls">
        @for (entry of catalog; track entry.id) {
          <button
            type="button"
            class="lab__chip"
            [class.lab__chip--active]="catalogId() === entry.id"
            (click)="setCatalogId(entry.id)"
          >
            {{ entry.label }}
          </button>
        }
      </div>

      @if (item(); as current) {
        <div class="lab__board">
          <ui-matrix-grid [cells]="current.cells" />
          <ui-matrix-choices
            [cells]="proposalCells()"
            [selectedIndex]="selected()"
            [annotations]="revealed() ? annotations() : null"
            (pick)="selected.set($event)"
          />
        </div>
        <div class="lab__rule">
          <span class="lab__field-label">Règle</span>
          <p class="lab__rule-text">{{ current.rule.userText }}</p>
          <span class="t-mono lab__rule-id"
            >{{ current.rule.id }} · registre
            {{ registerLabels[current.register] }} · seed
            {{ current.seed }}</span
          >
        </div>
      } @else {
        <p class="lab__error">
          Génération impossible pour ce type — à consigner.
        </p>
      }
    </div>
  `,
  styles: `
    .lab {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 20px;
      background: var(--bg);
      border-radius: 12px;
      max-width: 860px;
    }
    .lab__controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }
    .lab__generate {
      padding: 10px 18px;
      background: var(--brand);
      color: #fff;
      font: 700 14px/18px var(--font-ui);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }
    .lab__generate:hover {
      background: var(--brand-hover);
    }
    .lab__field {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .lab__field-label {
      font: 600 11px/14px var(--font-ui);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--label);
    }
    .lab__seed {
      width: 150px;
      padding: 8px 10px;
      font-size: 13px;
      border: 1px solid var(--border-hover);
      border-radius: 8px;
      background: var(--card);
      color: var(--ink);
    }
    .lab__chip {
      padding: 8px 12px;
      background: var(--card);
      color: var(--text-secondary);
      font: 600 13px/16px var(--font-ui);
      border: 1px solid var(--border-hover);
      border-radius: 8px;
      cursor: pointer;
    }
    .lab__chip--active {
      background: var(--brand-pastel);
      border-color: var(--brand);
      color: var(--brand-hover);
    }
    .lab__board {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 24px;
    }
    .lab__rule {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 14px 16px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
    }
    .lab__rule-text {
      margin: 0;
      font: 500 14px/20px var(--font-ui);
      color: var(--ink);
    }
    .lab__rule-id {
      font-size: 11px;
      color: var(--label);
    }
    .lab__error {
      font: 600 14px/20px var(--font-ui);
      color: var(--danger-text);
    }
  `,
})
export class MatrixLab {
  protected readonly catalog = MATRIX_CATALOG;
  protected readonly registerLabels = REGISTER_LABELS;

  protected readonly catalogId = signal(MATRIX_CATALOG[0].id);
  protected readonly seed = signal(randomSeed());
  protected readonly revealed = signal(false);
  protected readonly selected = signal<number | null>(null);

  protected readonly item = computed<MatrixItem | null>(() => {
    try {
      return generateMatrixItemFromCatalog(this.catalogId(), this.seed());
    } catch {
      return null;
    }
  });

  protected readonly proposalCells = computed(
    () => this.item()?.proposals.map((proposal) => proposal.cell) ?? [],
  );

  protected readonly annotations = computed<MatrixChoiceAnnotation[]>(
    () =>
      this.item()?.proposals.map((proposal) => ({
        label: PROPOSAL_KIND_LABELS[proposal.kind],
        correct: proposal.kind === MatrixProposalKind.CORRECT,
      })) ?? [],
  );

  protected generate(): void {
    this.seed.set(randomSeed());
    this.selected.set(null);
  }

  protected onSeedInput(value: string): void {
    this.seed.set(value);
    this.selected.set(null);
  }

  protected setCatalogId(catalogId: string): void {
    this.catalogId.set(catalogId);
    this.selected.set(null);
  }

  protected copySeed(): void {
    void navigator.clipboard?.writeText(this.seed()).catch(() => undefined);
  }
}
