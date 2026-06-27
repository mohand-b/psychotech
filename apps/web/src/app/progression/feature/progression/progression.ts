import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-progression',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './progression.html',
})
export class Progression {}
