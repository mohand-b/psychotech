import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { BoltIcon } from '../../../shared/ui/bolt-icon/bolt-icon';
import {
  BadgeStatusDto,
  FULL_SESSION_LABEL,
  Sector,
} from '@psychotech/shared';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { API_BASE_URL } from '../../../core/http/api-base-url.token';
import { BadgeArt } from '../../ui/badge-art';
import { BadgeTierRow } from '../../ui/badge-tier-row';
import { BadgeTransverseRow } from '../../ui/badge-transverse-row';
import { BadgeBoardView, buildBadgeBoard } from './badges-page-view';

@Component({
  selector: 'app-badges-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeArt, BadgeTierRow, BadgeTransverseRow, BoltIcon, RouterLink],
  templateUrl: './badges-page.html',
  styleUrl: './badges-page.css',
  host: { class: 'page-shell' },
})
export class BadgesPage {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly authFacade = inject(AuthFacade);

  private readonly statusesResource = httpResource<BadgeStatusDto[]>(
    () => `${this.baseUrl}/me/badges`,
    { defaultValue: [] },
  );

  protected readonly fullSessionLabel = FULL_SESSION_LABEL;

  private readonly sector = computed(
    () => this.authFacade.currentUser()?.currentSector ?? Sector.RAILWAY,
  );

  protected readonly board = computed<BadgeBoardView>(() =>
    buildBadgeBoard(this.statusesResource.value(), this.sector()),
  );
}
