import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowRight } from 'lucide-angular';
import { Icon } from '../../../shared/ui/icon/icon';
import { LandingLink } from '../../util/landing-link';
import { buildLandingAnchorHref } from '../../util/landing-sections';

export type LandingButtonSize = 'nav' | 'hero' | 'step' | 'cta' | 'card';
export type LandingButtonAppearance = 'solid' | 'outline';

const ARROW_SIZE: Record<LandingButtonSize, number> = {
  nav: 16,
  hero: 18,
  step: 16,
  cta: 17,
  card: 16,
};

@Component({
  selector: 'app-landing-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, NgTemplateOutlet, RouterLink],
  host: {
    '[class.landing-button--block]': "size() !== 'nav'",
    '[class.landing-button--card]': "size() === 'card'",
  },
  template: `
    @if (route(); as target) {
      <a
        [class]="classes()"
        [routerLink]="target.route"
        [queryParams]="target.queryParams"
      >
        <ng-container [ngTemplateOutlet]="label" />
      </a>
    } @else {
      <a [class]="classes()" [href]="anchor()">
        <ng-container [ngTemplateOutlet]="label" />
      </a>
    }
    <ng-template #label>
      <ng-content />
      @if (arrow()) {
        <ui-icon [img]="arrowIcon" [size]="arrowSize()" />
      }
    </ng-template>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    :host(.landing-button--card) {
      display: flex;
      width: 100%;
    }
    .button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: var(--landing-font-ui);
      font-weight: 600;
      line-height: 1;
      color: var(--landing-text);
      text-decoration: none;
    }
    .button--solid {
      background: var(--landing-accent);
    }
    .button--solid:hover {
      background: var(--landing-accent-hover);
    }
    .button--outline {
      border: 1px solid var(--landing-border-strong);
      background: var(--landing-bg);
      color: var(--landing-text-strong);
    }
    .button--outline:hover {
      border-color: var(--landing-border-hover);
      color: var(--landing-text);
    }
    .button--nav {
      padding: 9px 16px;
      border-radius: var(--landing-radius-button);
      font-size: 14px;
    }
    .button--hero {
      padding: 13px 22px;
      border-radius: var(--landing-radius-button-hero);
      font-size: 15px;
    }
    .button--step {
      padding: 12px 20px;
      border-radius: var(--landing-radius-button);
      font-size: 14.5px;
    }
    .button--card {
      justify-content: center;
      width: 100%;
      height: 44px;
      border-radius: var(--landing-radius-button);
      font-size: 14px;
    }
    .button--outline.button--card {
      border-color: var(--landing-border-card);
      background: transparent;
      color: var(--landing-text);
    }
    .button--outline.button--card:hover {
      border-color: var(--landing-border-card);
      background: var(--landing-surface-raised);
    }
    .button--cta {
      padding: 16px 28px;
      border-radius: var(--landing-radius-cta);
      font-size: 16px;
      line-height: 22px;
    }
    @media (max-width: 1023px) {
      :host(.landing-button--block) {
        display: flex;
        width: 100%;
      }
      .button--nav {
        padding: 10px 14px;
        font-size: 13.5px;
      }
      .button--hero,
      .button--step,
      .button--cta,
      .button--card {
        justify-content: center;
        width: 100%;
        padding: 0;
        border-radius: var(--landing-radius-cta);
      }
      .button--hero {
        height: 50px;
        font-size: 16px;
      }
      .button--outline.button--hero {
        height: 46px;
      }
      .button--step {
        height: 48px;
      }
      .button--card {
        height: 48px;
        font-size: 14.5px;
      }
      .button--solid.button--card {
        border-bottom: 3px solid var(--brand-relief);
      }
      .button--solid.button--card:active {
        transform: translateY(2px);
        border-bottom-width: 1px;
      }
      .button--cta {
        height: 52px;
        font-size: 15px;
        line-height: 1;
      }
      .button--solid:active {
        background: var(--landing-accent-hover);
      }
      .button--outline:active {
        background:
          linear-gradient(
            var(--landing-surface-pressed),
            var(--landing-surface-pressed)
          ),
          var(--landing-bg);
      }
      .button--hero ui-icon {
        scale: calc(16 / 18);
      }
      .button--cta ui-icon {
        scale: calc(16 / 17);
      }
    }
    @media (max-width: 389px) {
      .button--nav {
        padding: 10px 12px;
      }
    }
  `,
})
export class LandingButton {
  readonly link = input.required<LandingLink>();
  readonly size = input<LandingButtonSize>('hero');
  readonly appearance = input<LandingButtonAppearance>('solid');
  readonly arrow = input(false);

  protected readonly arrowIcon = ArrowRight;
  protected readonly arrowSize = computed(() => ARROW_SIZE[this.size()]);
  protected readonly classes = computed(
    () => `button button--${this.appearance()} button--${this.size()}`,
  );
  protected readonly route = computed(() => {
    const link = this.link();
    return 'route' in link ? link : null;
  });
  protected readonly anchor = computed(() => {
    const link = this.link();
    return 'section' in link
      ? buildLandingAnchorHref(link.section, true)
      : null;
  });
}
