import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';

@Component({
  selector: 'ui-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `<lucide-angular
    [img]="img()"
    [size]="size()"
    [strokeWidth]="strokeWidth()"
  />`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: inherit;
    }
  `,
})
export class Icon {
  readonly img = input.required<LucideIconData>();
  readonly size = input(15);
  readonly strokeWidth = input(2);
}
