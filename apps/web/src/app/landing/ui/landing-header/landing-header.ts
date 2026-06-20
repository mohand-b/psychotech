import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './landing-header.html',
  styleUrl: './landing-header.css',
})
export class LandingHeader {
  readonly scrolled = input(false);
}
