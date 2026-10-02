import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { SIGNUP_ENERGY_GRANT } from '@psychotech/shared';
import { LANDING_SCREENS } from '../../data/landing-screens';
import { LandingLink, landingPrimaryAction } from '../../util/landing-link';
import { LANDING_SECTION } from '../../util/landing-sections';
import { LandingButton } from '../landing-button/landing-button';
import { LandingDeviceFrame } from '../landing-device-frame/landing-device-frame';
import { LandingScreen } from '../landing-screen/landing-screen';
import { LandingSignalGrid } from '../landing-signal-grid/landing-signal-grid';

@Component({
  selector: 'app-landing-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LandingButton,
    LandingDeviceFrame,
    LandingScreen,
    LandingSignalGrid,
  ],
  templateUrl: './landing-hero.html',
  styleUrl: './landing-hero.css',
})
export class LandingHero {
  readonly authenticated = input(false);

  protected readonly sectionId = LANDING_SECTION.hero;
  protected readonly screens = LANDING_SCREENS;
  protected readonly signupGrant = SIGNUP_ENERGY_GRANT;
  protected readonly storyLink: LandingLink = {
    section: LANDING_SECTION.story,
  };
  protected readonly primaryAction = computed(() =>
    landingPrimaryAction(this.authenticated()),
  );
}
