import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { BadgeId } from '@psychotech/shared';
import { AxisIcon } from '../axis-icon/axis-icon';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export interface BadgeCelebrationView {
  badgeId: BadgeId;
  name: string;
  assetPath: string;
  familyLabel: string;
  tierName: string | null;
  tierColorVar: string | null;
  conditionLabel: string;
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
  private readonly document = inject(DOCUMENT);

  readonly view = input.required<BadgeCelebrationView>();
  readonly position = input.required<number>();
  readonly total = input.required<number>();
  readonly isLast = input.required<boolean>();

  readonly advance = output<void>();
  readonly closeAll = output<void>();

  protected readonly settled = signal(false);
  protected readonly leaving = signal(false);

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
    if (!this.leaving()) {
      this.settled.set(true);
    }
  }

  protected next(): void {
    if (this.leaving()) {
      return;
    }
    if (this.isLast() || this.prefersReducedMotion()) {
      this.settled.set(false);
      this.advance.emit();
    } else {
      this.leaving.set(true);
    }
  }

  private prefersReducedMotion(): boolean {
    const view = this.document.defaultView;
    if (typeof view?.matchMedia !== 'function') {
      return true;
    }
    return view.matchMedia(REDUCED_MOTION_QUERY).matches;
  }

  protected close(): void {
    this.closeAll.emit();
  }

  protected onCardAnimationEnd(event: AnimationEvent): void {
    if (event.target !== event.currentTarget || !this.leaving()) {
      return;
    }
    this.leaving.set(false);
    this.settled.set(false);
    this.advance.emit();
  }
}
