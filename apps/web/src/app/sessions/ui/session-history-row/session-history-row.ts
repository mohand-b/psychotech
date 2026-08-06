import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowRight, ChevronRight } from 'lucide-angular';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { AppIcon } from '../../../shared/ui/app-icon/app-icon';
import { AxisLabel } from '../../../shared/ui/axis-label/axis-label';
import { Icon } from '../../../shared/ui/icon/icon';
import { SessionRowView } from '../../feature/sessions/session-history-view';

@Component({
  selector: 'app-session-history-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIcon, AxisLabel, Icon, RouterLink],
  templateUrl: './session-history-row.html',
  styleUrl: './session-history-row.css',
})
export class SessionHistoryRow {
  readonly view = input.required<SessionRowView>();

  protected readonly arrowIcon = ArrowRight;
  protected readonly chevronIcon = ChevronRight;

  protected readonly axisPlainVar = computed(() => {
    const axis = this.view().axis;
    return axis ? AXIS_PRESENTATION[axis].plainVar : null;
  });
}
