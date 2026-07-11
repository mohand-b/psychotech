import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowRight, ChevronRight, LayoutGrid } from 'lucide-angular';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { AxisChip } from '../../../shared/ui/axis-chip/axis-chip';
import { Icon } from '../../../shared/ui/icon/icon';
import { SessionRowView } from '../../feature/sessions/session-history-view';

@Component({
  selector: 'app-session-history-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisChip, Icon, RouterLink],
  templateUrl: './session-history-row.html',
  styleUrl: './session-history-row.css',
})
export class SessionHistoryRow {
  readonly view = input.required<SessionRowView>();

  protected readonly simulationIcon = LayoutGrid;
  protected readonly arrowIcon = ArrowRight;
  protected readonly chevronIcon = ChevronRight;

  protected readonly axisPresentation = computed(() => {
    const axis = this.view().axis;
    return axis ? AXIS_PRESENTATION[axis] : null;
  });
}
