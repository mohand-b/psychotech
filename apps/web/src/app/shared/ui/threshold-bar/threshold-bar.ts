import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

@Component({
  selector: 'ui-threshold-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="bar__fill" [style.clipPath]="fillClip()"></span>
    <span class="bar__marker" [style.left.%]="threshold()"></span>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      height: var(--threshold-bar-height, 10px);
      border-radius: calc(var(--threshold-bar-height, 10px) / 2);
      background: var(--surface-muted);
    }
    .bar__fill {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      will-change: clip-path;
      background: linear-gradient(
        90deg,
        var(--threshold-bar-fill-from, var(--brand-loading)),
        var(--threshold-bar-fill-to, var(--brand-hover))
      );
    }
    .bar__fill::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 5px;
      right: 5px;
      height: 2px;
      border-radius: 1px;
      background: var(--relief-shine);
    }
    .bar__marker {
      position: absolute;
      top: calc(-1 * var(--threshold-bar-overhang, 4px));
      width: 2px;
      height: calc(
        var(--threshold-bar-height, 10px) + 2 *
          var(--threshold-bar-overhang, 4px)
      );
      border-radius: 1px;
      background: var(--ink);
    }
  `,
})
export class ThresholdBar {
  readonly value = input.required<number>();
  readonly threshold = input.required<number>();

  protected readonly clampedValue = computed(() =>
    Math.min(100, Math.max(0, this.value())),
  );

  // Découpe plutôt que mise à l'échelle : le dégradé reste calé sur la piste et
  // les arrondis gardent leur rayon, qu'un scaleX aplatirait en ellipse.
  protected readonly fillClip = computed(
    () => `inset(0 ${100 - this.clampedValue()}% 0 0 round 999px)`,
  );
}
