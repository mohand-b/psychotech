import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

@Component({
  selector: 'ui-threshold-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.is-settled]': 'settled()' },
  template: `
    <span class="bar__track">
      <span class="bar__fill" [style.clipPath]="fillClip()">
        <span class="bar__shine" [style.right]="shineEnd()"></span>
        <span class="bar__settle"></span>
      </span>
    </span>
    <span class="bar__marker" [style.left.%]="threshold()"></span>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      height: var(--threshold-bar-height, 10px);
      --threshold-bar-settle-duration: 460ms;
    }
    .bar__track {
      position: absolute;
      inset: 0;
      border-radius: 999px;
      overflow: hidden;
      background: var(--surface-muted);
    }
    .bar__fill {
      position: absolute;
      inset: 0;
      will-change: clip-path;
      background: linear-gradient(
        90deg,
        var(--threshold-bar-fill-from, var(--brand-loading)),
        var(--threshold-bar-fill-to, var(--brand-hover))
      );
    }
    .bar__shine {
      position: absolute;
      top: 20%;
      height: 20%;
      left: calc(var(--threshold-bar-height, 10px) / 2);
      border-radius: 999px;
      background: var(--relief-shine);
    }
    .bar__settle {
      position: absolute;
      inset: 0;
      opacity: 0;
      background: var(--relief-shine);
    }
    :host(.is-settled) .bar__settle {
      animation: threshold-bar-settle var(--threshold-bar-settle-duration)
        ease-out;
    }
    @keyframes threshold-bar-settle {
      0% {
        opacity: 0;
      }
      30% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
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
  readonly settled = input(false);

  protected readonly clampedValue = computed(() =>
    Math.min(100, Math.max(0, this.value())),
  );

  // Découpe plutôt que mise à l'échelle : le dégradé reste calé sur la piste et
  // les arrondis gardent leur rayon, qu'un scaleX aplatirait en ellipse.
  protected readonly fillClip = computed(
    () => `inset(0 ${100 - this.clampedValue()}% 0 0 round 999px)`,
  );

  // Le reflet s'arrête au début de la calotte de progression, avec le même
  // dégagement qu'à gauche : sans cela il court jusqu'au bord rempli et s'y
  // fait trancher à vif par la découpe.
  protected readonly shineEnd = computed(
    () =>
      `calc(${100 - this.clampedValue()}% + var(--threshold-bar-height, 10px) / 2)`,
  );
}
