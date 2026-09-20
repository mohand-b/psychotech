import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Injectable, Signal, inject } from '@angular/core';
import {
  CONTACT_FORM_EXPIRED_ERROR_CODE,
  CONTACT_HONEYPOT_FIELD,
  ContactProblemLocation,
  ContactReason,
  ContactReceiptDto,
  ContactScreenshotDto,
  ContactSuggestionArea,
  ContactTechnicalContextDto,
  SubmitContactDto,
} from '@psychotech/shared';
import { Observable, map, of, switchMap, tap } from 'rxjs';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { ContactSendStatus, ContactStore } from './contact.store';
import { SupportApi } from './support.api';

export type { ContactSendStatus };

export interface ContactDraft {
  reason: ContactReason;
  email: string;
  subject: string;
  area: ContactSuggestionArea | null;
  location: ContactProblemLocation | null;
  message: string;
  honeypot: string;
  technicalContext: ContactTechnicalContextDto | null;
  sessionId: string | null;
  screenshot: ContactScreenshotDto | null;
}

@Injectable({ providedIn: 'root' })
export class ContactFacade {
  private readonly api = inject(SupportApi);
  private readonly store = inject(ContactStore);
  private readonly authFacade = inject(AuthFacade);

  readonly status: Signal<ContactSendStatus> = this.store.status;
  readonly receipt: Signal<ContactReceiptDto | null> = this.store.receipt;

  prepare(): void {
    if (this.store.formToken() !== null) {
      return;
    }
    this.api.formToken().subscribe({
      next: ({ token }) => this.store.setFormToken(token),
      error: () => this.store.setFormToken(null),
    });
  }

  submit(draft: ContactDraft): void {
    if (this.store.status() === 'sending') {
      return;
    }
    this.store.startSending();
    this.formTokenForSubmission()
      .pipe(
        switchMap((formToken) => {
          const message = this.toMessage(draft, formToken);
          return this.authFacade.isAuthenticated()
            ? this.api.submitFromAccount(message)
            : this.api.submitAnonymously(message);
        }),
      )
      .subscribe({
        next: (receipt) => this.store.setSent(receipt),
        error: (error: unknown) => this.handleFailure(error),
      });
  }

  reset(): void {
    this.store.reset();
  }

  startAnother(): void {
    this.store.reset();
    this.prepare();
  }

  private formTokenForSubmission(): Observable<string> {
    const formToken = this.store.formToken();
    return formToken !== null
      ? of(formToken)
      : this.api.formToken().pipe(
          map(({ token }) => token),
          tap((token) => this.store.setFormToken(token)),
        );
  }

  private handleFailure(error: unknown): void {
    const response = error instanceof HttpErrorResponse ? error : null;
    if (
      response !== null &&
      JSON.stringify(response.error ?? '').includes(
        CONTACT_FORM_EXPIRED_ERROR_CODE,
      )
    ) {
      this.store.setFormToken(null);
      this.prepare();
    }
    this.store.setFailed(
      response?.status === HttpStatusCode.TooManyRequests
        ? 'rate-limited'
        : 'failed',
    );
  }

  private toMessage(draft: ContactDraft, formToken: string): SubmitContactDto {
    return {
      reason: draft.reason,
      message: draft.message,
      formToken,
      [CONTACT_HONEYPOT_FIELD]: draft.honeypot,
      ...(this.authFacade.isAuthenticated() ? {} : { email: draft.email }),
      ...(draft.subject ? { subject: draft.subject } : {}),
      ...(draft.area ? { area: draft.area } : {}),
      ...(draft.location ? { location: draft.location } : {}),
      ...(draft.technicalContext
        ? { technicalContext: draft.technicalContext }
        : {}),
      ...(draft.sessionId ? { sessionId: draft.sessionId } : {}),
      ...(draft.screenshot ? { screenshot: draft.screenshot } : {}),
    };
  }
}
