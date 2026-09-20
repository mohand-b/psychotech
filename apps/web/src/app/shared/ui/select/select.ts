import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { Check, ChevronDown } from 'lucide-angular';
import { Icon } from '../icon/icon';

export interface SelectOption<Value extends string = string> {
  value: Value;
  label: string;
}

const LIST_MAX_HEIGHT_PX = 264;
const LIST_OFFSET_PX = 6;
const NO_ACTIVE_OPTION = -1;

let nextSelectId = 0;

@Component({
  selector: 'ui-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: {
    '[class.ui-select-host--open]': 'open()',
    '[style.--select-list-offset.px]': 'listOffsetPx',
    '(document:pointerdown)': 'closeWhenOutside($event)',
  },
  template: `
    <button
      #trigger
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      class="ui-select__trigger"
      [class.ui-select__trigger--open]="open()"
      [class.ui-select__trigger--invalid]="invalid() && touched()"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="listId"
      [attr.aria-labelledby]="labelledBy()"
      [attr.aria-activedescendant]="activeDescendant()"
      [disabled]="disabled()"
      (click)="toggle()"
      (keydown)="onKeydown($event)"
      (blur)="close()"
    >
      <span
        class="ui-select__value"
        [class.ui-select__value--placeholder]="!selected()"
        >{{ selected()?.label ?? placeholder() }}</span
      >
      <ui-icon class="ui-select__chevron" [img]="chevronIcon" [size]="16" />
    </button>
    @if (open()) {
      <ul
        #list
        role="listbox"
        class="ui-select__list"
        [class.ui-select__list--above]="opensAbove()"
        [id]="listId"
        [style.max-height.px]="listMaxHeightPx"
        [attr.aria-labelledby]="labelledBy()"
        (mousedown)="$event.preventDefault()"
      >
        @for (option of options(); track option.value; let index = $index) {
          <li
            role="option"
            class="ui-select__option"
            [id]="optionId(index)"
            [class.ui-select__option--active]="activeIndex() === index"
            [class.ui-select__option--selected]="option.value === value()"
            [attr.aria-selected]="option.value === value()"
            (mousemove)="followPointer($event, index)"
            tabindex="-1"
            (click)="choose(index)"
            (keydown.enter)="choose(index)"
          >
            <span class="ui-select__option-label">{{ option.label }}</span>
            @if (option.value === value()) {
              <ui-icon
                class="ui-select__check"
                [img]="checkIcon"
                [size]="15"
                [strokeWidth]="2.4"
              />
            }
          </li>
        }
      </ul>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      --select-height: 42px;
      --select-font-size: 14px;
    }
    :host(.ui-select-host--open) {
      z-index: 40;
    }
    .ui-select__trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      width: 100%;
      height: var(--select-height);
      padding: 0 12px 0 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius-button);
      background: var(--card);
      font: 400 var(--select-font-size) / 1.4 var(--font-ui);
      color: var(--ink);
      text-align: left;
      cursor: pointer;
      outline: none;
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
    }
    .ui-select__trigger:hover:not(:disabled) {
      border-color: var(--border-hover);
    }
    .ui-select__trigger:focus-visible,
    .ui-select__trigger--open,
    .ui-select__trigger--open:hover:not(:disabled) {
      border-color: var(--brand);
      box-shadow: var(--shadow-focus);
    }
    .ui-select__trigger--invalid {
      border-color: var(--danger);
    }
    .ui-select__trigger:disabled {
      background: var(--surface-hover);
      color: var(--text-disabled);
      cursor: not-allowed;
    }
    .ui-select__value {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ui-select__value--placeholder {
      color: var(--text-disabled);
    }
    .ui-select__chevron {
      display: inline-flex;
      flex-shrink: 0;
      color: var(--text-secondary);
      transition: transform 0.18s ease;
    }
    .ui-select__trigger--open .ui-select__chevron {
      color: var(--brand);
      transform: rotate(180deg);
    }
    .ui-select__list {
      position: absolute;
      top: calc(100% + var(--select-list-offset));
      left: 0;
      right: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin: 0;
      padding: 6px;
      overflow-y: auto;
      list-style: none;
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      background: var(--card);
      box-shadow: var(--shadow-raised);
      animation: ui-select-reveal 0.14s ease-out;
      transform-origin: top center;
    }
    .ui-select__list--above {
      top: auto;
      bottom: calc(100% + var(--select-list-offset));
      transform-origin: bottom center;
    }
    .ui-select__option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 38px;
      padding: 0 10px;
      border-radius: var(--radius-chip);
      font: 500 var(--select-font-size) / 1.35 var(--font-ui);
      color: var(--ink);
      cursor: pointer;
    }
    .ui-select__option--active {
      background: var(--surface-muted);
    }
    .ui-select__option--selected {
      background: var(--brand-pastel);
      color: var(--brand-hover);
      font-weight: 600;
    }
    .ui-select__check {
      display: inline-flex;
      flex-shrink: 0;
      color: var(--brand);
    }
    @keyframes ui-select-reveal {
      from {
        opacity: 0;
        transform: scaleY(0.96);
      }
      to {
        opacity: 1;
        transform: scaleY(1);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .ui-select__list {
        animation: none;
      }
      .ui-select__chevron {
        transition: none;
      }
    }
  `,
})
export class Select<Value extends string = string>
  implements FormValueControl<Value | ''>
{
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly value = model<Value | ''>('');
  readonly touched = model(false);
  readonly options = input.required<readonly SelectOption<Value>[]>();
  readonly placeholder = input('');
  readonly labelledBy = input<string | null>(null);
  readonly disabled = input(false);
  readonly invalid = input(false);

  protected readonly chevronIcon = ChevronDown;
  protected readonly checkIcon = Check;
  protected readonly listMaxHeightPx = LIST_MAX_HEIGHT_PX;
  protected readonly listOffsetPx = LIST_OFFSET_PX;
  protected readonly listId = `ui-select-${nextSelectId++}`;

  protected readonly open = signal(false);
  protected readonly opensAbove = signal(false);
  protected readonly activeIndex = signal(NO_ACTIVE_OPTION);

  private readonly trigger =
    viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly list = viewChild<ElementRef<HTMLUListElement>>('list');

  protected readonly selected = computed(
    () =>
      this.options().find((option) => option.value === this.value()) ?? null,
  );
  protected readonly activeDescendant = computed(() =>
    this.open() && this.activeIndex() !== NO_ACTIVE_OPTION
      ? this.optionId(this.activeIndex())
      : null,
  );

  constructor() {
    afterRenderEffect(() => {
      const list = this.list()?.nativeElement;
      const index = this.activeIndex();
      if (list && index !== NO_ACTIVE_OPTION) {
        list.children.item(index)?.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  protected optionId(index: number): string {
    return `${this.listId}-option-${index}`;
  }

  protected toggle(): void {
    if (this.open()) {
      this.close();
    } else {
      this.show();
    }
  }

  protected close(): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    this.touched.set(true);
  }

  protected closeWhenOutside(event: Event): void {
    if (
      this.open() &&
      event.target instanceof Node &&
      !this.host.nativeElement.contains(event.target)
    ) {
      this.close();
    }
  }

  protected followPointer(event: MouseEvent, index: number): void {
    if (event.movementX !== 0 || event.movementY !== 0) {
      this.activeIndex.set(index);
    }
  }

  protected choose(index: number): void {
    const option = this.options()[index];
    if (option) {
      this.value.set(option.value);
    }
    this.close();
  }

  protected onKeydown(event: KeyboardEvent): void {
    const handled = this.open()
      ? this.handleOpenKey(event.key)
      : this.handleClosedKey(event.key);
    if (handled) {
      event.preventDefault();
    }
  }

  private handleClosedKey(key: string): boolean {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(key)) {
      this.show();
      return true;
    }
    return this.jumpToLabelStartingWith(key, true);
  }

  private handleOpenKey(key: string): boolean {
    const last = this.options().length - 1;
    switch (key) {
      case 'ArrowDown':
        this.activeIndex.update((index) => Math.min(last, index + 1));
        return true;
      case 'ArrowUp':
        this.activeIndex.update((index) => Math.max(0, index - 1));
        return true;
      case 'Home':
        this.activeIndex.set(0);
        return true;
      case 'End':
        this.activeIndex.set(last);
        return true;
      case 'Enter':
      case ' ':
        this.choose(this.activeIndex());
        return true;
      case 'Escape':
        this.close();
        return true;
      default:
        return this.jumpToLabelStartingWith(key, false);
    }
  }

  private jumpToLabelStartingWith(key: string, commit: boolean): boolean {
    if (key.length !== 1 || key === ' ') {
      return false;
    }
    const options = this.options();
    const start = this.activeIndex() + 1;
    const needle = key.toLocaleLowerCase();
    const offset = options.findIndex((_, position) =>
      options[(start + position) % options.length].label
        .toLocaleLowerCase()
        .startsWith(needle),
    );
    if (offset === -1) {
      return false;
    }
    const index = (start + offset) % options.length;
    this.activeIndex.set(index);
    if (commit) {
      this.value.set(options[index].value);
    }
    return true;
  }

  private show(): void {
    const selectedIndex = this.options().findIndex(
      (option) => option.value === this.value(),
    );
    this.activeIndex.set(selectedIndex === -1 ? 0 : selectedIndex);
    this.opensAbove.set(this.lacksRoomBelow());
    this.open.set(true);
  }

  private lacksRoomBelow(): boolean {
    const view = this.document.defaultView;
    if (!view) {
      return false;
    }
    const bounds = this.trigger().nativeElement.getBoundingClientRect();
    const needed = LIST_MAX_HEIGHT_PX + LIST_OFFSET_PX;
    return view.innerHeight - bounds.bottom < needed && bounds.top > needed;
  }
}
