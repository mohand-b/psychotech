import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { GamepadPairingDto } from '@psychotech/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class GamepadApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  createPairing(sessionId: string): Observable<GamepadPairingDto> {
    return this.http.post<GamepadPairingDto>(
      `${this.baseUrl}/sessions/${sessionId}/gamepad/pairing`,
      {},
    );
  }
}
