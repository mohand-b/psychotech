import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BadgeShine } from '../../shared/ui/badge-shine/badge-shine';

@Component({
  selector: 'ui-badge-art',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeShine],
  template: `
    <img
      class="badge-art"
      [class.badge-art--locked]="locked()"
      [src]="src()"
      [alt]="alt()"
    />
    @if (shining() && !locked()) {
      <ui-badge-shine />
    }
  `,
  styles: `
    :host {
      position: relative;
      display: inline-flex;
      flex-shrink: 0;
    }
    .badge-art {
      width: var(--badge-art-size, 48px);
      height: var(--badge-art-size, 48px);
      object-fit: contain;
      display: block;
    }
    .badge-art--locked {
      filter: grayscale(1);
      opacity: 0.4;
    }
  `,
})
export class BadgeArt {
  readonly src = input.required<string>();
  readonly alt = input('');
  readonly locked = input(false);
  readonly shining = input(false);
}
