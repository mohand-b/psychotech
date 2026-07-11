import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  AxisType,
  CompleteTargetedSessionDto,
  CurrentSessionDto,
  SessionDto,
  SessionHistoryPageDto,
  SimulationSummaryDto,
  StartSessionDto,
  TargetedAxisResultDto,
} from '@psychotech/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';
import { SessionHistoryQuery } from './session-history.filter';

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

  history(query: SessionHistoryQuery): Observable<SessionHistoryPageDto> {
    let params = new HttpParams();
    if (query.mode) {
      params = params.set('mode', query.mode);
    }
    if (query.axis) {
      params = params.set('axis', query.axis);
    }
    if (query.cursor) {
      params = params.set('cursor', query.cursor);
    }
    return this.http.get<SessionHistoryPageDto>(`${this.baseUrl}/sessions`, {
      params,
    });
  }

  current(): Observable<CurrentSessionDto | null> {
    return this.http.get<CurrentSessionDto | null>(
      `${this.baseUrl}/sessions/current`,
    );
  }

  simulationSummary(sessionId: string): Observable<SimulationSummaryDto> {
    return this.http.get<SimulationSummaryDto>(
      `${this.baseUrl}/sessions/${sessionId}/summary`,
    );
  }

}
