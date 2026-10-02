import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type LandingDeviceVariant =
  | 'desktop'
  | 'phone'
  | 'phone-landscape'
  | 'panel'
  | 'panel-light';

@Component({
  selector: 'app-landing-device-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.frame--desktop]': "variant() === 'desktop'",
    '[class.frame--phone]': "variant() === 'phone'",
    '[class.frame--phone-landscape]': "variant() === 'phone-landscape'",
    '[class.frame--panel]': "variant() === 'panel'",
    '[class.frame--panel-light]': "variant() === 'panel-light'",
  },
  template: `<ng-content />`,
  styles: `
    :host {
      position: relative;
      display: block;
      overflow: hidden;
      border: 0 solid var(--landing-bezel);
      background: var(--bg);
    }
    :host(.frame--desktop) {
      width: 820px;
      height: 520px;
      border-width: 6px 6px 0;
      border-radius: var(--landing-radius-desktop) var(--landing-radius-desktop)
        0 0;
      box-shadow: var(--landing-shadow-hero);
    }
    :host(.frame--phone) {
      width: 236px;
      height: 470px;
      border-width: 8px 8px 0;
      border-radius: var(--landing-radius-phone) var(--landing-radius-phone) 0 0;
      box-shadow: var(--landing-phone-ring);
    }
    :host(.frame--phone-landscape) {
      width: var(--landing-landscape-phone-width);
      height: var(--landing-landscape-phone-height);
      border-width: 6px;
      border-radius: var(--landing-radius-landscape-phone);
      box-shadow: var(--landing-phone-ring);
    }
    :host(.frame--panel),
    :host(.frame--panel-light) {
      width: var(--landing-panel-width);
      height: var(--landing-panel-height);
      border-width: 5px;
      border-radius: var(--landing-radius-panel);
      box-shadow: var(--landing-shadow-panel);
    }
    :host(.frame--panel-light) {
      width: var(--landing-showcase-width);
      height: var(--landing-showcase-height);
      border-radius: var(--landing-radius-showcase);
      box-shadow: var(--landing-shadow-panel-light);
    }
    @media (max-width: 1023px) {
      :host(.frame--desktop) {
        width: 300px;
        height: 212px;
        border-width: 4px 4px 0;
      }
      :host(.frame--phone) {
        width: 140px;
        height: 190px;
        border-width: 5px 5px 0;
      }
      :host(.frame--panel) {
        aspect-ratio: var(--landing-panel-aspect);
      }
      :host(.frame--panel-light) {
        border-width: 7px 7px 0;
        border-radius: var(--landing-radius-showcase)
          var(--landing-radius-showcase) 0 0;
      }
    }
  `,
})
export class LandingDeviceFrame {
  readonly variant = input.required<LandingDeviceVariant>();
}
