import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  ContactFormTokenDto,
  ContactReceiptDto,
  SubmitContactDto,
} from '@psychotech/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class SupportApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  formToken(): Observable<ContactFormTokenDto> {
    return this.http.get<ContactFormTokenDto>(
      `${this.baseUrl}/support/contact/token`,
    );
  }

  submitAnonymously(message: SubmitContactDto): Observable<ContactReceiptDto> {
    return this.http.post<ContactReceiptDto>(
      `${this.baseUrl}/support/contact`,
      message,
    );
  }

  submitFromAccount(message: SubmitContactDto): Observable<ContactReceiptDto> {
    return this.http.post<ContactReceiptDto>(
      `${this.baseUrl}/support/contact/account`,
      message,
    );
  }
}
