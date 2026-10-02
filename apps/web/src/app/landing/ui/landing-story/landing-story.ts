import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowRight } from 'lucide-angular';
import { Icon } from '../../../shared/ui/icon/icon';
import { LANDING_STORY_STEPS } from '../../data/landing-story-steps';
import { COMPACT_LAYOUT_MEDIA } from '../../util/compact-layout';
import { landingPrimaryAction } from '../../util/landing-link';
import { LANDING_SECTION } from '../../util/landing-sections';
import { twoDigitRank } from '../../util/two-digit-rank';
import {
  VerticalSpan,
  indexNearestToMiddleOf,
} from '../../util/viewport-focus';
import { LandingButton } from '../landing-button/landing-button';
import { LandingScreenStack } from '../landing-screen-stack/landing-screen-stack';

const LINK_ARROW_SIZE = 15;

@Component({
  selector: 'app-landing-story',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, LandingButton, LandingScreenStack, RouterLink],
  templateUrl: './landing-story.html',
  styleUrl: './landing-story.css',
})
export class LandingStory {
  readonly authenticated = input(false);

  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly stepElements = viewChildren<ElementRef<HTMLElement>>('step');

  protected readonly sectionId = LANDING_SECTION.story;
  protected readonly steps = LANDING_STORY_STEPS.map((step, index) => ({
    ...step,
    rank: twoDigitRank(index + 1),
  }));
  protected readonly arrowIcon = ArrowRight;
  protected readonly linkArrowSize = LINK_ARROW_SIZE;
  protected readonly stepScreens = LANDING_STORY_STEPS.map(
    (step) => step.screen,
  );
  protected readonly activeIndex = signal(0);
  protected readonly activeCaption = computed(
    () => this.steps[this.activeIndex()].caption,
  );
  protected readonly primaryAction = computed(() =>
    landingPrimaryAction(this.authenticated()),
  );

  constructor() {
    afterNextRender(() => {
      const view = this.document.defaultView;
      if (!view) {
        return;
      }
      const compactLayout = view.matchMedia(COMPACT_LAYOUT_MEDIA);
      const uncoveredViewport = (): VerticalSpan => ({
        top: compactLayout.matches
          ? Math.max(
              0,
              this.stage().nativeElement.getBoundingClientRect().bottom,
            )
          : 0,
        bottom: view.innerHeight,
      });
      const sync = (): void =>
        this.activeIndex.set(
          indexNearestToMiddleOf(
            this.stepElements().map((step) =>
              step.nativeElement.getBoundingClientRect(),
            ),
            uncoveredViewport(),
            this.activeIndex(),
          ),
        );
      sync();
      view.addEventListener('scroll', sync, { passive: true });
      view.addEventListener('resize', sync, { passive: true });
      this.destroyRef.onDestroy(() => {
        view.removeEventListener('scroll', sync);
        view.removeEventListener('resize', sync);
      });
    });
  }
}
