import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { AxisType } from '@psychotech/shared';

export type AxisIconId = AxisType | 'examen';

export const AXIS_ICON_SIZE = {
  chip: 16,
  card: 22,
  hero: 44,
} as const;

const AXIS_ICON_PATHS: Partial<Record<AxisType, string>> & {
  examen: string;
} = {
  [AxisType.LOGIC]: '/icons/icone-logique.svg',
  [AxisType.MEMORY]: '/icons/icone-memoire.svg',
  [AxisType.VISUAL_DISCRIMINATION]: '/icons/icone-discrimination.svg',
  [AxisType.REACTIVITY]: '/icons/icone-reactivite.svg',
  [AxisType.MOTOR_SKILLS]: '/icons/icone-motricite.svg',
  examen: '/icons/icone-examen.svg',
};

@Component({
  selector: 'ui-axis-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
  template: `
    @if (src(); as path) {
      <img
        [src]="path"
        [width]="size()"
        [height]="size()"
        [alt]="label() ?? ''"
        [attr.aria-hidden]="label() ? null : true"
      />
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    img {
      display: block;
      object-fit: contain;
    }
  `,
})
export class AxisIcon {
  readonly axis = input.required<AxisIconId>();
  readonly size = input<number>(AXIS_ICON_SIZE.chip);
  readonly label = input<string | null>(null);

  protected readonly src = computed(() => {
    const axis = this.axis();
    return axis === 'examen'
      ? AXIS_ICON_PATHS.examen
      : (AXIS_ICON_PATHS[axis] ?? null);
  });
}
