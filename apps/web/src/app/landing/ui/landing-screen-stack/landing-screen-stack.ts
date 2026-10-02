import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LandingScreenAsset } from '../../data/landing-screens';
import {
  LandingDeviceFrame,
  LandingDeviceVariant,
} from '../landing-device-frame/landing-device-frame';
import { LandingScreen } from '../landing-screen/landing-screen';

@Component({
  selector: 'app-landing-screen-stack',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LandingDeviceFrame, LandingScreen],
  template: `
    <app-landing-device-frame [variant]="variant()">
      @for (screen of screens(); track $index) {
        <app-landing-screen
          class="stack__layer"
          [class.stack__layer--active]="$index === activeIndex()"
          [attr.aria-hidden]="$index === activeIndex() ? null : 'true'"
          [screen]="screen"
        />
      }
    </app-landing-device-frame>
    @for (screen of screens(); track $index) {
      @if (screen.companion; as companion) {
        <app-landing-device-frame
          class="stack__companion"
          [class.stack__companion--active]="$index === activeIndex()"
          [attr.aria-hidden]="$index === activeIndex() ? null : 'true'"
          variant="phone-landscape"
        >
          <app-landing-screen [screen]="companion" />
        </app-landing-device-frame>
      }
    }
  `,
  styles: `
    :host {
      position: relative;
      display: block;
    }
    .stack__layer,
    .stack__companion {
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--landing-stack-fade) ease;
    }
    .stack__layer--active,
    .stack__companion--active {
      opacity: 1;
    }
    .stack__companion {
      position: absolute;
      inset: var(--landing-companion-inset);
      filter: var(--landing-companion-shadow);
    }
    @media (max-width: 1023px) {
      .stack__companion {
        display: none;
      }
    }
  `,
})
export class LandingScreenStack {
  readonly screens = input.required<readonly LandingScreenAsset[]>();
  readonly activeIndex = input.required<number>();
  readonly variant = input.required<LandingDeviceVariant>();
}
