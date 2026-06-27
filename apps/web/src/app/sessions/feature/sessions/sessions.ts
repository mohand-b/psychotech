import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-sessions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sessions.html',
})
export class Sessions {}
