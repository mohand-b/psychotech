import { Injectable, Signal, signal } from '@angular/core';
import {
  SimulationSummaryDto,
  TargetedAxisResultDto,
} from '@psychotech/shared';
import { EMPTY, Observable, of } from 'rxjs';
import { buildExampleBilan } from '../data/example-bilan.fixture';

// Date figée : le bilan public doit être identique d'un rendu à l'autre, y
// compris au prerender, sinon le HTML servi diverge de celui hydraté.
const EXAMPLE_COMPLETED_AT = '2026-06-14T18:30:00.000Z';

// Remplace la façade de session sur la route publique. Aucune requête, donc
// aucun endpoint authentifié appelé, et aucun store applicatif touché.
@Injectable()
export class ExampleBilanFacade {
  private readonly summarySignal = signal<SimulationSummaryDto | null>(
    buildExampleBilan(EXAMPLE_COMPLETED_AT),
  );

  readonly summary: Signal<SimulationSummaryDto | null> =
    this.summarySignal.asReadonly();

  loadSummary(): Observable<SimulationSummaryDto> {
    const summary = this.summarySignal();
    return summary ? of(summary) : EMPTY;
  }

  // Aucun détail d'axe à charger : l'exemple n'a pas de session derrière lui, et
  // la page rend ses lignes d'axe non dépliables.
  loadAxisDetail(): Observable<TargetedAxisResultDto> {
    return EMPTY;
  }
}
