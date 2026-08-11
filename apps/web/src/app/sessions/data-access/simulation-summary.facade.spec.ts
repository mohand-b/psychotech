import { TestBed } from '@angular/core/testing';
import { SimulationSummaryDto } from '@psychotech/shared';
import { Subject, of } from 'rxjs';
import { SessionsApi } from './sessions.api';
import { SimulationSummaryFacade } from './simulation-summary.facade';

function summaryFor(sessionId: string): SimulationSummaryDto {
  return { sessionId, globalScore: 74.8 } as SimulationSummaryDto;
}

describe('SimulationSummaryFacade', () => {
  let facade: SimulationSummaryFacade;
  let simulationSummary: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    simulationSummary = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        SimulationSummaryFacade,
        {
          provide: SessionsApi,
          useValue: { simulationSummary, targetedResult: vi.fn() },
        },
      ],
    });
    facade = TestBed.inject(SimulationSummaryFacade);
  });

  it('serves the cached summary when the same session is requested again', () => {
    const first = summaryFor('session-1');
    simulationSummary.mockReturnValue(of(first));
    facade.loadSummary('session-1').subscribe();

    facade.loadSummary('session-1').subscribe();

    expect(simulationSummary).toHaveBeenCalledTimes(1);
    expect(facade.summary()).toEqual(first);
  });

  it('clears the previous summary before another session loads so its score never leaks', () => {
    simulationSummary.mockReturnValue(of(summaryFor('session-1')));
    facade.loadSummary('session-1').subscribe();

    const pending = new Subject<SimulationSummaryDto>();
    simulationSummary.mockReturnValue(pending.asObservable());
    facade.loadSummary('session-2').subscribe();

    expect(facade.summary()).toBeNull();

    const second = summaryFor('session-2');
    pending.next(second);
    expect(facade.summary()).toEqual(second);
  });
});
