import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AxisType } from '@psychotech/shared';
import { BookOpen } from 'lucide-angular';
import { GuideLinkTarget } from '../../util/guide-anchors';
import { AXIS_PRESENTATION } from '../axis-presentation';
import { Icon } from '../icon/icon';

@Component({
  selector: 'ui-guide-link',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RouterLink],
  template: `
    <a
      class="guide-link"
      [routerLink]="link().path"
      [fragment]="link().fragment ?? undefined"
      [style.color]="presentation().textVar"
    >
      <ui-icon [img]="guideIcon" [size]="14" />
      {{ link().label }}
    </a>
  `,
  styles: `
    :host {
      display: block;
    }
    .guide-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font: 600 13.5px/1.3 var(--font-ui);
      text-decoration: none;
    }
    .guide-link:hover {
      text-decoration: underline;
    }
  `,
})
export class GuideLink {
  readonly link = input.required<GuideLinkTarget>();
  readonly axis = input.required<AxisType>();

  protected readonly guideIcon = BookOpen;

  protected readonly presentation = computed(
    () => AXIS_PRESENTATION[this.axis()],
  );
}
