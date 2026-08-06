import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { AxisType } from '@psychotech/shared';

export type AppIconGlyph = AxisType | 'examen';

const APP_ICON_CLASSES: Partial<Record<AxisType, string>> = {
  [AxisType.LOGIC]: 'app-icon--logique',
  [AxisType.MEMORY]: 'app-icon--memoire',
  [AxisType.VISUAL_DISCRIMINATION]: 'app-icon--discrimination',
  [AxisType.REACTIVITY]: 'app-icon--reactivite',
  [AxisType.MOTOR_SKILLS]: 'app-icon--motricite',
};

const EXAM_ICON_CLASS = 'app-icon--examen';

@Component({
  selector: 'ui-app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  host: {
    '[class]': 'glyphClass()',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    'aria-hidden': 'true',
  },
  styles: `
    :host {
      display: inline-block;
      width: 1em;
      height: 1em;
      flex-shrink: 0;
      background-color: currentColor;
      mask: var(--app-icon) center / contain no-repeat;
      -webkit-mask: var(--app-icon) center / contain no-repeat;
    }
    :host(.app-icon--logique) {
      --app-icon: url('/icons/icone-logique.svg');
    }
    :host(.app-icon--memoire) {
      --app-icon: url('/icons/icone-memoire.svg');
    }
    :host(.app-icon--discrimination) {
      --app-icon: url('/icons/icone-discrimination.svg');
    }
    :host(.app-icon--reactivite) {
      --app-icon: url('/icons/icone-reactivite.svg');
    }
    :host(.app-icon--motricite) {
      --app-icon: url('/icons/icone-motricite.svg');
    }
    :host(.app-icon--examen) {
      --app-icon: url('/icons/icone-examen.svg');
    }
  `,
})
export class AppIcon {
  readonly glyph = input.required<AppIconGlyph>();
  readonly size = input<number | null>(null);

  protected readonly glyphClass = computed(() => {
    const glyph = this.glyph();
    return glyph === 'examen'
      ? EXAM_ICON_CLASS
      : (APP_ICON_CLASSES[glyph] ?? '');
  });
}
