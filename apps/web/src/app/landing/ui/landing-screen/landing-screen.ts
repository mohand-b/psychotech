import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LandingScreenAsset } from '../../data/landing-screens';
import { COMPACT_LAYOUT_MEDIA } from '../../util/compact-layout';

@Component({
  selector: 'app-landing-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
  template: `
    @if (screen().compactSrc; as compactSrc) {
      <picture class="screen__picture">
        <source [attr.media]="compactMedia" [attr.srcset]="compactSrc" />
        <img
          class="screen"
          [src]="screen().src"
          [alt]="screen().alt"
          loading="lazy"
          decoding="async"
        />
      </picture>
    } @else {
      <img
        class="screen"
        [ngSrc]="screen().src"
        [alt]="screen().alt"
        [priority]="priority()"
        fill
      />
    }
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      display: block;
    }
    .screen__picture {
      display: block;
      width: 100%;
      height: 100%;
    }
    .screen__picture .screen {
      display: block;
      width: 100%;
      height: 100%;
    }
    .screen {
      object-fit: cover;
      object-position: var(--landing-screen-position, top);
    }
  `,
})
export class LandingScreen {
  readonly screen = input.required<LandingScreenAsset>();
  readonly priority = input(false);

  protected readonly compactMedia = COMPACT_LAYOUT_MEDIA;
}
