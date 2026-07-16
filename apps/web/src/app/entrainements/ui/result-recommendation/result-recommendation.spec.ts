import { TestBed } from '@angular/core/testing';
import {
  AxisFinding,
  AxisType,
  RecommendationPriority,
  getAxisRecommendations,
} from '@psychotech/shared';
import { ResultRecommendation } from './result-recommendation';

function buildFinding(overrides: Partial<AxisFinding> = {}): AxisFinding {
  return {
    id: 'REACTIVITY_FATIGUE_SLOPE',
    severity: RecommendationPriority.MEDIUM,
    finding: 'Votre temps de réaction se dégrade de 18 % en fin d’épreuve',
    recommendation: 'Travaillez des sessions complètes sans pause',
    ...overrides,
  };
}

async function setup(axis: AxisType, findings: AxisFinding[]) {
  await TestBed.configureTestingModule({
    imports: [ResultRecommendation],
  }).compileComponents();
  const fixture = TestBed.createComponent(ResultRecommendation);
  fixture.componentRef.setInput('axis', axis);
  fixture.componentRef.setInput('findings', findings);
  fixture.detectChanges();
  return fixture;
}

describe('ResultRecommendation', () => {
  it('renders a single finding with its recommendation emphasised', async () => {
    const fixture = await setup(AxisType.REACTIVITY, [buildFinding()]);
    const items = fixture.nativeElement.querySelectorAll('.reco__item');
    expect(items).toHaveLength(1);
    expect(items[0].querySelector('.reco__text').textContent).toContain(
      'Votre temps de réaction se dégrade de 18 % en fin d’épreuve.',
    );
    expect(items[0].querySelector('.reco__action').textContent).toBe(
      'Travaillez des sessions complètes sans pause',
    );
  });

  it('renders up to three findings without any priority badge', async () => {
    const fixture = await setup(AxisType.LOGIC, [
      buildFinding({ id: 'a', severity: RecommendationPriority.HIGH }),
      buildFinding({ id: 'b', severity: RecommendationPriority.MEDIUM }),
      buildFinding({ id: 'c', severity: RecommendationPriority.LOW }),
    ]);
    expect(fixture.nativeElement.querySelectorAll('.reco__item')).toHaveLength(
      3,
    );
    expect(fixture.nativeElement.querySelector('.reco__badge')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('.t-label').textContent,
    ).toBe('Recommandations');
  });

  it('keeps the severity order produced by getAxisRecommendations', async () => {
    const findings = getAxisRecommendations([
      buildFinding({
        id: 'low',
        severity: RecommendationPriority.LOW,
        finding: 'Constat mineur',
      }),
      buildFinding({
        id: 'high',
        severity: RecommendationPriority.HIGH,
        finding: 'Constat majeur',
      }),
    ]);
    const fixture = await setup(AxisType.MEMORY, findings);
    const texts = [
      ...fixture.nativeElement.querySelectorAll('.reco__text'),
    ].map((node) => (node as HTMLElement).textContent ?? '');
    expect(texts[0]).toContain('Constat majeur');
    expect(texts[1]).toContain('Constat mineur');
  });

  it('tints the markers with the axis color token', async () => {
    const fixture = await setup(AxisType.VISUAL_DISCRIMINATION, [
      buildFinding(),
    ]);
    const marker = fixture.nativeElement.querySelector(
      '.reco__marker',
    ) as HTMLElement;
    expect(marker.style.color).toContain('--axis-discrimination-text');
  });
});
