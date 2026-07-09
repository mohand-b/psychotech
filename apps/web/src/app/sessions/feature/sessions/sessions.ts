import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  AXIS_TRAINING,
  RailwayPlayableAxis,
  SessionMode,
} from '@psychotech/shared';
import { ChevronDown, LucideIconData } from 'lucide-angular';
import { SessionHistoryFacade } from '../../data-access/session-history.facade';
import { SessionHistoryFilter } from '../../data-access/session-history.filter';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { SessionHistoryRow } from '../../ui/session-history-row/session-history-row';
import {
  SessionRowView,
  buildSessionRowView,
  groupSessionsByPeriod,
} from './session-history-view';

interface FilterChipView {
  value: SessionHistoryFilter;
  label: string;
  shortLabel: string;
  icon: LucideIconData | null;
  iconVar: string | null;
}

interface RowGroupView {
  label: string;
  rows: SessionRowView[];
}

@Component({
  selector: 'app-sessions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, SessionHistoryRow],
  templateUrl: './sessions.html',
  styleUrl: './sessions.css',
})
export class Sessions {
  private readonly facade = inject(SessionHistoryFacade);
  private readonly router = inject(Router);
  private readonly now = new Date();

  protected readonly chevronDownIcon = ChevronDown;

  protected readonly filter = this.facade.filter;
  protected readonly loading = this.facade.loading;
  protected readonly loadingMore = this.facade.loadingMore;
  protected readonly nextCursor = this.facade.nextCursor;

  protected readonly filterChips: FilterChipView[] = [
    {
      value: 'ALL',
      label: 'Toutes',
      shortLabel: 'Toutes',
      icon: null,
      iconVar: null,
    },
    {
      value: SessionMode.FULL,
      label: 'Simulations complètes',
      shortLabel: 'Simulations',
      icon: null,
      iconVar: null,
    },
    {
      value: SessionMode.TARGETED,
      label: 'Entraînements ciblés',
      shortLabel: 'Ciblés',
      icon: null,
      iconVar: null,
    },
    ...(Object.keys(AXIS_TRAINING) as RailwayPlayableAxis[]).map((axis) => ({
      value: axis as SessionHistoryFilter,
      label: AXIS_PRESENTATION[axis].label,
      shortLabel: AXIS_PRESENTATION[axis].label,
      icon: AXIS_PRESENTATION[axis].icon,
      iconVar: AXIS_PRESENTATION[axis].textVar,
    })),
  ];

  protected readonly groups = computed<RowGroupView[]>(() =>
    groupSessionsByPeriod(this.facade.items(), this.now).map((group) => ({
      label: group.label,
      rows: group.items.map((item) => buildSessionRowView(item, this.now)),
    })),
  );

  constructor() {
    this.facade.load('ALL');
  }

  protected selectFilter(filter: SessionHistoryFilter): void {
    if (filter !== this.facade.filter()) {
      this.facade.load(filter);
    }
  }

  protected loadMore(): void {
    this.facade.loadMore();
  }
}
