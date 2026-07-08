import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  AxisType,
  CompleteTargetedSessionDto,
  SessionDto,
  StartSessionDto,
  TargetedAxisResultDto,
} from '@psychotech/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class SessionsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  start(payload: StartSessionDto): Observable<SessionDto> {
    return this.http.post<SessionDto>(`${this.baseUrl}/sessions`, payload);
  }

  get(sessionId: string): Observable<SessionDto> {
    return this.http.get<SessionDto>(`${this.baseUrl}/sessions/${sessionId}`);
  }

  completeTargeted(
    sessionId: string,
    axis: AxisType,
    payload: CompleteTargetedSessionDto,
  ): Observable<SessionDto> {
    return this.http.post<SessionDto>(
      `${this.baseUrl}/sessions/${sessionId}/axes/${axis}/results`,
      payload,
    );
  }

  targetedResult(
    sessionId: string,
    axis: AxisType,
  ): Observable<TargetedAxisResultDto> {
    return this.http.get<TargetedAxisResultDto>(
      `${this.baseUrl}/sessions/${sessionId}/axes/${axis}/results`,
    );
  }

  abandon(sessionId: string): Observable<SessionDto> {
    return this.http.post<SessionDto>(
      `${this.baseUrl}/sessions/${sessionId}/abandon`,
      {},
    );
  }
}
