import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import {
  DominoFace,
  DominoItem,
  DominoLevel,
  DominoTile,
  generateDominoItem,
  mod7,
} from '@psychotech/shared';
import { DominoInput } from './domino-input';
import {
  DominoGapAnnotation,
  DominoHalf,
  DominoSequence,
} from './domino-sequence';

const LEVELS: readonly DominoLevel[] = [1, 2, 3, 4];

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

function signedDelta(from: DominoFace, to: DominoFace): string {
  const raw = mod7(to - from);
  const signed = raw > 3 ? raw - 7 : raw;
  if (signed === 0) {
    return '·';
  }
  return signed > 0 ? `+${signed}` : `${signed}`;
}

export function dominoGapAnnotations(
  tiles: readonly DominoTile[],
): DominoGapAnnotation[] {
  const annotations: DominoGapAnnotation[] = [];
  for (let index = 0; index < tiles.length - 1; index += 1) {
    annotations.push({
      top: signedDelta(tiles[index].top, tiles[index + 1].top),
      bottom: signedDelta(tiles[index].bottom, tiles[index + 1].bottom),
    });
  }
  return annotations;
}

@Component({
  selector: 'app-domino-lab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DominoInput, DominoSequence],
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
        <button
          type="button"
          class="lab__chip"
          [class.lab__chip--active]="revealed()"
          (click)="toggleReveal()"
        >
          Révéler
        </button>
      </div>

      @if (item(); as current) {
        <ui-domino-sequence
          [tiles]="visibleTiles()"
          [answerTop]="inputTop()"
          [answerBottom]="inputBottom()"
          [activeHalf]="activeHalf()"
          [annotations]="revealed() ? annotations() : null"
          (pickHalf)="activeHalf.set($event)"
        />
        <div class="lab__entry">
          <ui-domino-input
            [top]="inputTop()"
            [bottom]="inputBottom()"
            [activeHalf]="activeHalf()"
            (pickFace)="onFace($event)"
            (pickHalf)="activeHalf.set($event)"
          />
          @if (verdict(); as state) {
            <span
              class="lab__verdict"
              [class.lab__verdict--good]="state === 'good'"
              [class.lab__verdict--bad]="state === 'bad'"
            >
              {{ state === 'good' ? 'Bonne réponse' : 'Mauvaise réponse' }}
            </span>
          }
        </div>
        <div class="lab__rule">
          <span class="lab__field-label">Règle</span>
          <p class="lab__rule-text">{{ current.rule.userText }}</p>
          <span class="t-mono lab__rule-id"
            >{{ current.rule.id }} · {{ current.length }} dominos ·
            {{ current.hasWrap ? 'avec bouclage' : 'sans bouclage' }} · seed
            {{ current.seed }}</span
          >
        </div>
      } @else {
        <p class="lab__error">Génération impossible — à consigner.</p>
      }
    </div>
  `,
  styles: `
    .lab {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 20px;
      background: var(--bg);
      border-radius: 12px;
      max-width: 780px;
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
    .lab__entry {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .lab__verdict {
      font: 700 13px/16px var(--font-ui);
    }
    .lab__verdict--good {
      color: var(--success-text);
    }
    .lab__verdict--bad {
      color: var(--danger-text);
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
export class DominoLab {
  protected readonly levels = LEVELS;

  protected readonly level = signal<DominoLevel>(1);
  protected readonly seed = signal(randomSeed());
  protected readonly revealed = signal(false);
  protected readonly activeHalf = signal<DominoHalf>('top');
  protected readonly inputTop = signal<DominoFace | null>(null);
  protected readonly inputBottom = signal<DominoFace | null>(null);

  protected readonly item = computed<DominoItem | null>(() => {
    try {
      return generateDominoItem({ level: this.level(), seed: this.seed() });
    } catch {
      return null;
    }
  });

  protected readonly visibleTiles = computed(
    () => this.item()?.visibleTiles ?? [],
  );

  protected readonly annotations = computed<DominoGapAnnotation[]>(() => {
    const current = this.item();
    return current ? dominoGapAnnotations(current.tiles) : [];
  });

  protected readonly verdict = computed<'good' | 'bad' | null>(() => {
    const current = this.item();
    const top = this.inputTop();
    const bottom = this.inputBottom();
    if (!current || top === null || bottom === null || this.revealed()) {
      return null;
    }
    return top === current.answer.top && bottom === current.answer.bottom
      ? 'good'
      : 'bad';
  });

  protected onFace(face: DominoFace): void {
    if (this.activeHalf() === 'top') {
      this.inputTop.set(face);
      this.activeHalf.set('bottom');
    } else {
      this.inputBottom.set(face);
    }
  }

  protected toggleReveal(): void {
    const next = !this.revealed();
    this.revealed.set(next);
    if (next) {
      const answer = this.item()?.answer;
      if (answer) {
        this.inputTop.set(answer.top);
        this.inputBottom.set(answer.bottom);
      }
    }
  }

  protected generate(): void {
    this.seed.set(randomSeed());
    this.resetInput();
  }

  protected onSeedInput(value: string): void {
    this.seed.set(value);
    this.resetInput();
  }

  protected setLevel(level: DominoLevel): void {
    this.level.set(level);
    this.resetInput();
  }

  private resetInput(): void {
    this.inputTop.set(null);
    this.inputBottom.set(null);
    this.activeHalf.set('top');
    this.revealed.set(false);
  }

  protected copySeed(): void {
    void navigator.clipboard?.writeText(this.seed()).catch(() => undefined);
  }
}
