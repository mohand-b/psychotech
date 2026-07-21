import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
} from '@angular/core';
import {
  AxisType,
  LOGIC_FAMILY_FILTER_LABELS,
  LogicFamilyFilter,
  RailwayPlayableAxis,
  TrainingOptionId,
  trainingOptionsForAxis,
} from '@psychotech/shared';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Dices,
  Grid3x3,
  Hash,
  Keyboard,
  LayoutGrid,
  LucideIconData,
} from 'lucide-angular';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { Icon } from '../../../shared/ui/icon/icon';
import { Keycap } from '../../../shared/ui/keycap/keycap';
import { Toggle } from '../../../shared/ui/toggle/toggle';
import {
  AXIS_BRIEFING_CONTENT,
  BriefingArrow,
} from './axis-briefing-content';

interface FamilySegment {
  value: LogicFamilyFilter | null;
  label: string;
  icon: LucideIconData;
}

const LOGIC_FAMILY_SEGMENTS: FamilySegment[] = [
  { value: null, label: 'Tous les blocs', icon: LayoutGrid },
  {
    value: LogicFamilyFilter.NUMERIC,
    label: LOGIC_FAMILY_FILTER_LABELS[LogicFamilyFilter.NUMERIC],
    icon: Hash,
  },
  {
    value: LogicFamilyFilter.DOMINO,
    label: LOGIC_FAMILY_FILTER_LABELS[LogicFamilyFilter.DOMINO],
    icon: Dices,
  },
  {
    value: LogicFamilyFilter.MATRIX,
    label: LOGIC_FAMILY_FILTER_LABELS[LogicFamilyFilter.MATRIX],
    icon: Grid3x3,
  },
];

const ARROW_ICONS: Record<BriefingArrow, LucideIconData> = {
  up: ArrowUp,
  down: ArrowDown,
  left: ArrowLeft,
  right: ArrowRight,
};

@Component({
  selector: 'ui-axis-briefing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Keycap, Toggle],
  template: `
    <div
      class="axis-briefing"
      [style.--axis-plain]="presentation().plainVar"
      [style.--axis-pastel]="presentation().pastelVar"
      [style.--axis-pastel-bd]="presentation().pastelBorderVar"
      [style.--axis-text]="presentation().textVar"
    >
      <header class="axis-briefing__hero">
        <span class="axis-briefing__tile">
          <ui-icon [img]="presentation().icon" [size]="30" />
        </span>
        @if (positionLabel(); as position) {
          <span class="axis-briefing__position t-mono">{{ position }}</span>
        }
        <h1 class="axis-briefing__name">{{ presentation().label }}</h1>
        <p class="axis-briefing__tagline">{{ content().tagline }}</p>
      </header>

      <article class="axis-briefing__card">
        <section class="axis-briefing__section">
          <span class="t-label">Comment ça se passe</span>
          <div class="axis-briefing__steps">
            @for (step of content().steps; track $index) {
              <div class="axis-briefing__step">
                <span class="axis-briefing__step-number t-mono">{{
                  $index + 1
                }}</span>
                <span class="axis-briefing__step-text">{{ step }}</span>
              </div>
            }
          </div>
        </section>

        <section class="axis-briefing__section">
          <span class="t-label">Commandes</span>
          @if (content().mapping; as mapping) {
            <div
              class="axis-briefing__mapping axis-briefing__platform--desktop"
            >
              @for (signal of mapping; track signal.label) {
                <div class="axis-briefing__mapping-row">
                  <span class="axis-briefing__signal">
                    <span class="axis-briefing__signal-dot">
                      <span
                        class="axis-briefing__signal-shape"
                        [class.axis-briefing__signal-shape--square]="
                          signal.shape === 'square'
                        "
                        [style.background]="signal.colorVar"
                      ></span>
                    </span>
                    <span class="axis-briefing__signal-label">{{
                      signal.label
                    }}</span>
                  </span>
                  <ui-icon
                    class="axis-briefing__mapping-arrow"
                    [img]="mappingArrowIcon"
                    [size]="12"
                  />
                  <span class="axis-briefing__row-icon">
                    <ui-icon [img]="keyboardIcon" [size]="14" />
                  </span>
                  @if (signal.key; as key) {
                    <ui-keycap [label]="key" />
                  } @else if (signal.arrow; as arrow) {
                    <ui-keycap [icon]="arrowIcon(arrow)" />
                  }
                </div>
              }
            </div>
            <div
              class="axis-briefing__mapping-tiles axis-briefing__platform--mobile"
            >
              @for (signal of mapping; track signal.label) {
                <div class="axis-briefing__mapping-tile">
                  <span
                    class="axis-briefing__signal-shape axis-briefing__signal-shape--big"
                    [class.axis-briefing__signal-shape--square]="
                      signal.shape === 'square'
                    "
                    [style.background]="signal.colorVar"
                  ></span>
                  <ui-icon
                    class="axis-briefing__mapping-arrow"
                    [img]="mappingDownIcon"
                    [size]="12"
                  />
                  <ui-keycap variant="button" [label]="signal.mobileButton" />
                  <span class="axis-briefing__mapping-tile-label">{{
                    signal.label
                  }}</span>
                </div>
              }
            </div>
          }
          @if (content().desktopRows.length > 0) {
            <div class="axis-briefing__rows axis-briefing__platform--desktop">
              @for (row of content().desktopRows; track $index) {
                <div class="axis-briefing__row">
                  <span class="axis-briefing__row-icon">
                    <ui-icon [img]="row.icon" [size]="14" />
                  </span>
                  <span class="axis-briefing__row-parts">
                    @for (part of row.parts; track $index) {
                      @if (part.key; as key) {
                        <ui-keycap [label]="key" />
                      } @else if (part.arrow; as arrow) {
                        <ui-keycap [icon]="arrowIcon(arrow)" />
                      } @else {
                        <span class="axis-briefing__row-text">{{
                          part.text
                        }}</span>
                      }
                    }
                  </span>
                </div>
              }
            </div>
          }
          @if (content().mobileRows.length > 0) {
            <div class="axis-briefing__rows axis-briefing__platform--mobile">
              @for (row of content().mobileRows; track $index) {
                <div class="axis-briefing__row">
                  <span class="axis-briefing__row-icon">
                    <ui-icon [img]="row.icon" [size]="13" />
                  </span>
                  <span class="axis-briefing__row-parts">
                    @for (part of row.parts; track $index) {
                      @if (part.button; as buttonLabel) {
                        <ui-keycap variant="button" [label]="buttonLabel" />
                      } @else {
                        <span class="axis-briefing__row-text">{{
                          part.text
                        }}</span>
                      }
                    }
                  </span>
                </div>
              }
            </div>
          }
        </section>

        <section class="axis-briefing__section">
          <span class="t-label">Ce qui est évalué</span>
          <div class="axis-briefing__chips">
            @for (chip of content().evaluated; track chip.label) {
              <span class="axis-briefing__chip">
                <ui-icon
                  class="axis-briefing__chip-icon"
                  [img]="chip.icon"
                  [size]="13"
                />
                <span class="axis-briefing__chip-label">{{ chip.label }}</span>
              </span>
            }
          </div>
        </section>

        <section
          class="axis-briefing__section axis-briefing__section--summary"
        >
          <span class="t-label">Résumé</span>
          <span class="axis-briefing__summary">
            @for (entry of summary(); track entry.label; let last = $last) {
              <span class="axis-briefing__summary-entry">
                <span class="axis-briefing__summary-value t-mono">{{
                  entry.value
                }}</span>
                <span class="axis-briefing__summary-label">{{
                  entry.label
                }}</span>
                @if (!last) {
                  <span class="axis-briefing__summary-dot">·</span>
                }
              </span>
            }
          </span>
        </section>
      </article>

      @if (showOptionsCard()) {
        <article class="axis-briefing__card">
          <span class="t-label">Options d'entraînement</span>
          @for (option of trainingOptions(); track option.id) {
            <div class="axis-briefing__option">
              <span class="axis-briefing__option-copy">
                <span class="axis-briefing__option-title">{{
                  option.label
                }}</span>
                <span class="axis-briefing__option-detail">{{
                  option.description
                }}</span>
              </span>
              <ui-toggle
                [checked]="isOptionEnabled(option.id)"
                [label]="option.label"
                (checkedChange)="setOptionEnabled(option.id, $event)"
              />
            </div>
          }
          @if (showFamilySelector()) {
            <div class="axis-briefing__families">
              <span class="axis-briefing__option-copy">
                <span class="axis-briefing__option-title"
                  >Familles travaillées</span
                >
                <span class="axis-briefing__option-detail"
                  >La session ne contient que les items des familles
                  choisies.</span
                >
              </span>
              <div
                class="axis-briefing__family-segments"
                role="radiogroup"
                aria-label="Familles travaillées"
              >
                @for (segment of familySegments; track segment.label) {
                  <button
                    type="button"
                    role="radio"
                    class="axis-briefing__family-segment"
                    [class.axis-briefing__family-segment--active]="
                      logicFamily() === segment.value
                    "
                    [attr.aria-checked]="logicFamily() === segment.value"
                    (click)="logicFamily.set(segment.value)"
                  >
                    <ui-icon [img]="segment.icon" [size]="13" />
                    {{ segment.label }}
                  </button>
                }
              </div>
            </div>
          }
        </article>
      }

      @if (showPairing()) {
        <article
          class="axis-briefing__card axis-briefing__card--pairing axis-briefing__platform--desktop"
        >
          <ng-content select="[briefingPairing]" />
        </article>
      }

      @if (showCrankInfo()) {
        <article
          class="axis-briefing__card axis-briefing__card--cranks axis-briefing__platform--mobile"
        >
          <span class="t-label">Manivelles tactiles</span>
          <p class="axis-briefing__cranks-text">
            Les deux manivelles s'affichent sous le parcours, à portée de
            pouce. Aucun appairage nécessaire sur mobile.
          </p>
        </article>
      }
    </div>
  `,
  styleUrl: './axis-briefing.css',
})
export class AxisBriefing {
  readonly axis = input.required<AxisType>();
  readonly showOptions = input(true);
  readonly tutorial = input(false);
  readonly positionLabel = input<string | null>(null);
  readonly showPairing = input(false);
  readonly enabledOptions = model<TrainingOptionId[]>([]);
  readonly logicFamily = model<LogicFamilyFilter | null>(null);

  protected readonly presentation = computed(
    () => AXIS_PRESENTATION[this.axis()],
  );

  protected readonly content = computed(
    () => AXIS_BRIEFING_CONTENT[this.axis() as RailwayPlayableAxis],
  );

  protected readonly summary = computed(() =>
    this.tutorial()
      ? this.content().discoverySummary
      : this.content().summary,
  );

  protected readonly trainingOptions = computed(() =>
    trainingOptionsForAxis(this.axis()),
  );

  protected readonly showFamilySelector = computed(
    () => !this.tutorial() && this.axis() === AxisType.LOGIC,
  );

  protected readonly showOptionsCard = computed(
    () =>
      this.showOptions() &&
      !this.tutorial() &&
      (this.trainingOptions().length > 0 || this.showFamilySelector()),
  );

  protected readonly showCrankInfo = computed(
    () => this.axis() === AxisType.MOTOR_SKILLS && !this.tutorial(),
  );

  protected readonly familySegments = LOGIC_FAMILY_SEGMENTS;
  protected readonly keyboardIcon = Keyboard;
  protected readonly mappingArrowIcon = ArrowRight;
  protected readonly mappingDownIcon = ArrowDown;

  protected arrowIcon(arrow: BriefingArrow): LucideIconData {
    return ARROW_ICONS[arrow];
  }

  protected isOptionEnabled(id: TrainingOptionId): boolean {
    return this.enabledOptions().includes(id);
  }

  protected setOptionEnabled(id: TrainingOptionId, enabled: boolean): void {
    this.enabledOptions.update((ids) =>
      enabled
        ? [...ids.filter((other) => other !== id), id]
        : ids.filter((other) => other !== id),
    );
  }
}
