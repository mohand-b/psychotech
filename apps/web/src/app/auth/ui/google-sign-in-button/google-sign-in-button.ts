import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ui-google-sign-in-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './google-sign-in-button.html',
  styleUrl: './google-sign-in-button.css',
})
export class GoogleSignInButton {
  readonly href = input.required<string>();
  readonly label = input.required<string>();
}
