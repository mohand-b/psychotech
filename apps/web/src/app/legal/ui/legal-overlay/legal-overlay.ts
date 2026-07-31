import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { LEGAL_LAST_UPDATED } from '@psychotech/shared';
import {
  LegalDocumentId,
  legalDocumentById,
} from '../../data/legal-documents';
import { Button } from '../../../shared/ui/button/button';
import { LegalDocumentView } from '../legal-document/legal-document';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

@Component({
  selector: 'ui-legal-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, LegalDocumentView],
  templateUrl: './legal-overlay.html',
  styleUrl: './legal-overlay.css',
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class LegalOverlay {
  private readonly documentRef = inject(DOCUMENT);

  readonly documentId = input.required<LegalDocumentId | null>();
  readonly anchor = input<string | null>(null);
  readonly closed = output<void>();

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  protected readonly lastUpdated = LEGAL_LAST_UPDATED;

  protected readonly legalDocument = computed(() => {
    const id = this.documentId();
    return id ? legalDocumentById(id) : null;
  });

  constructor() {
    effect(() => {
      const open = this.legalDocument() !== null;
      this.documentRef.body.style.overflow = open ? 'hidden' : '';
      if (!open) {
        return;
      }
      queueMicrotask(() => this.focusPanel());
    });
  }

  protected onEscape(): void {
    if (this.legalDocument()) {
      this.closed.emit();
    }
  }

  protected close(): void {
    this.closed.emit();
  }

  protected trapFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
      return;
    }
    const host = this.panel()?.nativeElement;
    if (!host) {
      return;
    }
    const focusable = Array.from(
      host.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((node) => node.offsetParent !== null);
    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = this.documentRef.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusPanel(): void {
    const host = this.panel()?.nativeElement;
    if (!host) {
      return;
    }
    host.focus();
    const target = this.anchor();
    if (target) {
      host.querySelector(`#${CSS.escape(target)}`)?.scrollIntoView();
    }
  }
}
