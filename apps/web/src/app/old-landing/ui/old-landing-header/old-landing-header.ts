import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE_NAME } from '../../../core/seo/route-seo';

@Component({
  selector: 'app-old-landing-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './old-landing-header.html',
  styleUrl: './old-landing-header.css',
})
export class OldLandingHeader {
  readonly scrolled = input(false);
  readonly authenticated = input(false);
  readonly onLanding = input(true);

  protected readonly siteName = SITE_NAME;

  protected anchor(id: string): string {
    return this.onLanding() ? `#${id}` : `/#${id}`;
  }
}
