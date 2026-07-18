import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import {
  MatrixCompositionVariant,
  MatrixItem,
  MatrixLevel,
  MatrixProposalKind,
  MatrixRegister,
  MatrixStructure,
  generateMatrixItem,
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

const STRUCTURE_LABELS: Record<MatrixStructure, string> = {
  [MatrixStructure.CROSSED]: 'Croisées',
  [MatrixStructure.DISTRIBUTION]: 'Distribution',
  [MatrixStructure.COMPOSITION]: 'Composition',
};

const VARIANT_LABELS: Record<MatrixCompositionVariant, string> = {
  [MatrixCompositionVariant.ADDITION]: 'Addition',
  [MatrixCompositionVariant.SOUSTRACTION]: 'Soustraction',
  [MatrixCompositionVariant.EMBOITEMENT]: 'Emboîtement',
};

const REGISTER_LABELS: Record<MatrixRegister, string> = {
  [MatrixRegister.FIGURES]: 'Figures',
  [MatrixRegister.TRAITS]: 'Traits',
};

const LEVELS: readonly MatrixLevel[] = [1, 2, 3, 4, 5];

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
        <div class="lab__group">
          @for (option of structures; track option) {
            <button
              type="button"
              class="lab__chip"
              [class.lab__chip--active]="structure() === option"
              (click)="setStructure(option)"
            >
              {{ structureLabels[option] }}
            </button>
          }
        </div>
        @if (structure() === compositionStructure) {
          <div class="lab__group">
            @for (option of variants; track option) {
              <button
                type="button"
                class="lab__chip"
                [class.lab__chip--active]="variant() === option"
                (click)="setVariant(option)"
              >
                {{ variantLabels[option] }}
              </button>
            }
          </div>
        }
        <div class="lab__group">
          @for (option of levels; track option) {
            <button
              type="button"
              class="lab__chip"
              [class.lab__chip--active]="level() === option"
              (click)="setLevel(option)"
            >
              N{{ option }}
            </button>
          }
        </div>
        <div class="lab__group">
          <button
            type="button"
            class="lab__chip"
            [class.lab__chip--active]="register() === null"
            (click)="setRegister(null)"
          >
            Registre aléatoire
          </button>
          @for (option of registerOptions; track option) {
            <button
              type="button"
              class="lab__chip"
              [class.lab__chip--active]="register() === option"
              (click)="setRegister(option)"
            >
              {{ registerLabels[option] }}
            </button>
          }
        </div>
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
            {{ registerLabels[current.register].toLowerCase() }} · seed
            {{ current.seed }}</span
          >
        </div>
      } @else {
        <p class="lab__error">
          Génération impossible pour cette combinaison — à consigner.
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
      max-width: 820px;
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
    .lab__group {
      display: flex;
      gap: 6px;
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
  protected readonly structures = Object.values(MatrixStructure);
  protected readonly variants = Object.values(MatrixCompositionVariant);
  protected readonly registerOptions = Object.values(MatrixRegister);
  protected readonly structureLabels = STRUCTURE_LABELS;
  protected readonly variantLabels = VARIANT_LABELS;
  protected readonly registerLabels = REGISTER_LABELS;
  protected readonly levels = LEVELS;
  protected readonly compositionStructure = MatrixStructure.COMPOSITION;

  protected readonly structure = signal<MatrixStructure>(
    MatrixStructure.CROSSED,
  );
  protected readonly variant = signal<MatrixCompositionVariant>(
    MatrixCompositionVariant.ADDITION,
  );
  protected readonly register = signal<MatrixRegister | null>(null);
  protected readonly level = signal<MatrixLevel>(1);
  protected readonly seed = signal(randomSeed());
  protected readonly revealed = signal(false);
  protected readonly selected = signal<number | null>(null);

  protected readonly item = computed<MatrixItem | null>(() => {
    try {
      return generateMatrixItem({
        structure: this.structure(),
        level: this.level(),
        seed: this.seed(),
        register: this.register() ?? undefined,
        variant:
          this.structure() === MatrixStructure.COMPOSITION
            ? this.variant()
            : undefined,
      });
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

  protected setStructure(structure: MatrixStructure): void {
    this.structure.set(structure);
    this.selected.set(null);
  }

  protected setVariant(variant: MatrixCompositionVariant): void {
    this.variant.set(variant);
    this.selected.set(null);
  }

  protected setRegister(register: MatrixRegister | null): void {
    this.register.set(register);
    this.selected.set(null);
  }

  protected setLevel(level: MatrixLevel): void {
    this.level.set(level);
    this.selected.set(null);
  }

  protected copySeed(): void {
    void navigator.clipboard?.writeText(this.seed()).catch(() => undefined);
  }
}
