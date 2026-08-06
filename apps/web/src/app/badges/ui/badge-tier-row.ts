import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';
import { BadgeArt } from './badge-art';
import { BadgeConditions } from './badge-conditions';
import { TieredBadgeCardView } from './badge-views';

@Component({
  selector: 'ui-badge-tier-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeArt, BadgeConditions],
  templateUrl: './badge-tier-row.html',
  styleUrl: './badge-tier-row.css',
})
export class BadgeTierRow {
  readonly card = input.required<TieredBadgeCardView>();
}
