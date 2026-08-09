import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { BadgeId } from '@psychotech/shared';
import { AxisIcon } from '../axis-icon/axis-icon';

export interface BadgeCelebrationCondition {
  label: string;
  justValidated: boolean;
}

export interface BadgeCelebrationView {
  badgeId: BadgeId;
  name: string;
  assetPath: string;
  familyLabel: string;
  tierName: string | null;
  tierColorVar: string | null;
  conditions: BadgeCelebrationCondition[];
  gain: number | null;
}

@Component({
  selector: 'ui-badge-celebration-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisIcon],
  templateUrl: './badge-celebration-modal.html',
  styleUrl: './badge-celebration-modal.css',
})
export class BadgeCelebrationModal {
  readonly view = input.required<BadgeCelebrationView>();
  readonly position = input.required<number>();
  readonly total = input.required<number>();
  readonly isLast = input.required<boolean>();

  readonly advance = output<void>();
  readonly closeAll = output<void>();

  protected readonly settled = signal(false);

  protected readonly views = computed(() => [this.view()]);

  protected readonly microLabel = computed(() =>
    this.total() > 1
      ? `Badge ${this.position()} sur ${this.total()}`
      : this.view().familyLabel,
  );

  protected readonly ctaLabel = computed(() =>
    this.isLast() ? 'Continuer' : 'Badge suivant',
  );

  protected readonly dots = computed(() =>
    this.total() > 1
      ? Array.from({ length: this.total() }, (_, index) => ({
          active: index === this.position() - 1,
        }))
      : [],
  );

  protected settle(): void {
    this.settled.set(true);
  }

  protected next(): void {
    this.settled.set(false);
    this.advance.emit();
  }

  protected close(): void {
    this.closeAll.emit();
  }
}
