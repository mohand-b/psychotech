import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AxisType, ScoreBand, Sector } from '@psychotech/shared';
import { ResultSummary } from './result-summary';

async function setup(inputs: {
  score: number;
  previousBestScore: number | null;
  isNewBest?: boolean;
}): Promise<ComponentFixture<ResultSummary>> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [ResultSummary],
  }).compileComponents();
  const fixture = TestBed.createComponent(ResultSummary);
  fixture.componentRef.setInput('axis', AxisType.LOGIC);
  fixture.componentRef.setInput('score', inputs.score);
  fixture.componentRef.setInput('band', ScoreBand.ACCEPTABLE);
  fixture.componentRef.setInput('previousBestScore', inputs.previousBestScore);
  fixture.componentRef.setInput(
    'bestScore',
    Math.max(inputs.score, inputs.previousBestScore ?? 0),
  );
  fixture.componentRef.setInput('isNewBest', inputs.isNewBest ?? false);
  fixture.componentRef.setInput('isEqualBest', false);
  fixture.componentRef.setInput('sector', Sector.RAILWAY);
  fixture.componentRef.setInput('completedAt', '2026-07-16T10:00:00.000Z');
  fixture.detectChanges();
  return fixture;
}

function deltaText(fixture: ComponentFixture<ResultSummary>): string | null {
  const delta = fixture.nativeElement.querySelector(
    '.summary__delta',
  ) as HTMLElement | null;
  return delta ? (delta.textContent ?? '').trim() : null;
}

describe('ResultSummary', () => {
  it('shows a positive delta against the previous best when the record is beaten', async () => {
    const fixture = await setup({
      score: 78,
      previousBestScore: 70,
      isNewBest: true,
    });
    expect(deltaText(fixture)).toBe('+8');
  });

  it('shows a negative delta against the previous best when the record stands', async () => {
    const fixture = await setup({ score: 62, previousBestScore: 70 });
    expect(deltaText(fixture)).toBe('-8');
  });

  it('shows no delta on a first session without previous best', async () => {
    const fixture = await setup({
      score: 62,
      previousBestScore: null,
      isNewBest: true,
    });
    expect(deltaText(fixture)).toBeNull();
  });
});
