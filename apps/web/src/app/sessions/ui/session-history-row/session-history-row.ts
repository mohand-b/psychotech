import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowRight, ChevronRight } from 'lucide-angular';
import { AxisIcon } from '../../../shared/ui/axis-icon/axis-icon';
import { AxisLabel } from '../../../shared/ui/axis-label/axis-label';
import { Icon } from '../../../shared/ui/icon/icon';
import { SessionRowView } from '../../feature/sessions/session-history-view';

@Component({
  selector: 'app-session-history-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisIcon, AxisLabel, Icon, RouterLink],
  templateUrl: './session-history-row.html',
  styleUrl: './session-history-row.css',
})
export class SessionHistoryRow {
  readonly view = input.required<SessionRowView>();

  protected readonly arrowIcon = ArrowRight;
  protected readonly chevronIcon = ChevronRight;
}
