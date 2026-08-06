import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';

@Component({
  selector: 'ui-badge-art',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img
      class="badge-art"
      [class.badge-art--locked]="locked()"
      [src]="src()"
      [alt]="alt()"
    />
  `,
  styles: `
    :host {
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
      opacity: 0.35;
    }
  `,
})
export class BadgeArt {
  readonly src = input.required<string>();
  readonly alt = input('');
  readonly locked = input(false);
}
