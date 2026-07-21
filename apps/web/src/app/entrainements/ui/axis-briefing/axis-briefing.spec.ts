import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  AxisType,
  LogicFamilyFilter,
  RailwayPlayableAxis,
} from '@psychotech/shared';
import { AxisBriefing } from './axis-briefing';
import { AXIS_BRIEFING_CONTENT } from './axis-briefing-content';

const PLAYABLE_AXES = Object.keys(
  AXIS_BRIEFING_CONTENT,
) as RailwayPlayableAxis[];

interface RenderOptions {
  tutorial?: boolean;
  showOptions?: boolean;
  showPairing?: boolean;
}

function render(
  axis: RailwayPlayableAxis,
  options: RenderOptions = {},
): ComponentFixture<AxisBriefing> {
  const fixture = TestBed.createComponent(AxisBriefing);
  fixture.componentRef.setInput('axis', axis);
  fixture.componentRef.setInput('tutorial', options.tutorial ?? false);
  fixture.componentRef.setInput('showOptions', options.showOptions ?? true);
  fixture.componentRef.setInput('showPairing', options.showPairing ?? false);
  fixture.detectChanges();
  return fixture;
}

function texts(fixture: ComponentFixture<AxisBriefing>, selector: string) {
  const element: HTMLElement = fixture.nativeElement;
  return Array.from(element.querySelectorAll(selector)).map(
    (node) => node.textContent?.trim() ?? '',
  );
}

function keycaps(root: ParentNode): string[] {
  return Array.from(root.querySelectorAll('ui-keycap')).map(
    (node) => node.textContent?.trim() ?? '',
  );
}

describe('AxisBriefing (gabarit unifié)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AxisBriefing],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it.each(PLAYABLE_AXES)(
    'shows the tagline, the numbered steps and the evaluated chips of axis %s',
    (axis) => {
      const fixture = render(axis);
      const content = AXIS_BRIEFING_CONTENT[axis];
      expect(texts(fixture, '.axis-briefing__tagline')).toEqual([
        content.tagline,
      ]);
      expect(texts(fixture, '.axis-briefing__step-text')).toEqual(
        content.steps,
      );
      expect(texts(fixture, '.axis-briefing__step-number')).toEqual([
        '1',
        '2',
        '3',
      ]);
      expect(texts(fixture, '.axis-briefing__chip-label')).toEqual(
        content.evaluated.map(({ label }) => label),
      );
    },
  );

  it.each(PLAYABLE_AXES)(
    'shows the full summary on the targeted briefing and the reduced one on the discovery briefing of axis %s',
    (axis) => {
      const content = AXIS_BRIEFING_CONTENT[axis];
      expect(texts(render(axis), '.axis-briefing__summary-value')).toEqual(
        content.summary.map(({ value }) => value),
      );
      expect(
        texts(render(axis, { tutorial: true }), '.axis-briefing__summary-value'),
      ).toEqual(content.discoverySummary.map(({ value }) => value));
    },
  );

  it('renders desktop keycaps and mobile button keycaps in separate platform blocks', () => {
    const fixture = render(AxisType.MEMORY);
    const element: HTMLElement = fixture.nativeElement;
    const desktop = element.querySelector(
      '.axis-briefing__rows.axis-briefing__platform--desktop',
    ) as HTMLElement;
    const mobile = element.querySelector(
      '.axis-briefing__rows.axis-briefing__platform--mobile',
    ) as HTMLElement;
    expect(desktop).not.toBeNull();
    expect(mobile).not.toBeNull();
    expect(keycaps(desktop)).toEqual([
      '0-9',
      'ESPACE',
      'RETOUR',
      'ENTRÉE',
    ]);
    expect(keycaps(mobile)).toEqual(['0-9', 'Passer', '⌫', 'Valider']);
  });

  it('never mentions the P key on the memory briefing', () => {
    const fixture = render(AxisType.MEMORY);
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).not.toMatch(/(^|\s)P($|\s)/);
    expect(element.textContent).toContain('ESPACE');
  });

  it('maps every reactivity signal to its desktop command and its mobile button', () => {
    const fixture = render(AxisType.REACTIVITY);
    const element: HTMLElement = fixture.nativeElement;
    const desktopRows = Array.from(
      element.querySelectorAll('.axis-briefing__mapping-row'),
    );
    expect(desktopRows).toHaveLength(3);
    expect(texts(fixture, '.axis-briefing__signal-label')).toEqual([
      'Rond jaune',
      'Rond bleu',
      'Carré rouge',
    ]);
    expect(keycaps(desktopRows[2])).toEqual(['ESPACE']);
    const tiles = element.querySelector(
      '.axis-briefing__mapping-tiles',
    ) as HTMLElement;
    expect(keycaps(tiles)).toEqual([
      'Bouton gauche',
      'Bouton droit',
      'Pédale',
    ]);
  });

  it('shows the options card with axis toggles on the targeted briefing only', () => {
    const targeted = render(AxisType.LOGIC);
    expect(
      targeted.nativeElement.querySelectorAll('ui-toggle'),
    ).toHaveLength(2);
    expect(targeted.nativeElement.textContent).toContain(
      "Options d'entraînement",
    );

    const simulation = render(AxisType.LOGIC, { showOptions: false });
    expect(
      simulation.nativeElement.querySelectorAll('ui-toggle'),
    ).toHaveLength(0);
    expect(simulation.nativeElement.textContent).not.toContain(
      "Options d'entraînement",
    );

    const discovery = render(AxisType.LOGIC, { tutorial: true });
    expect(
      discovery.nativeElement.querySelectorAll('ui-toggle'),
    ).toHaveLength(0);
    expect(discovery.nativeElement.textContent).not.toContain(
      "Options d'entraînement",
    );
  });

  it('offers the four family segments for logic and syncs the selection with the model', () => {
    const fixture = render(AxisType.LOGIC);
    const element: HTMLElement = fixture.nativeElement;
    const segments = Array.from(
      element.querySelectorAll<HTMLButtonElement>(
        '.axis-briefing__family-segment',
      ),
    );
    expect(segments.map((segment) => segment.textContent?.trim())).toEqual([
      'Tous les blocs',
      'Numérique',
      'Dominos',
      'Matrices',
    ]);
    expect(segments[0].getAttribute('aria-checked')).toBe('true');

    segments[2].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.logicFamily()).toBe(
      LogicFamilyFilter.DOMINO,
    );
    expect(segments[2].getAttribute('aria-checked')).toBe('true');
    expect(segments[0].getAttribute('aria-checked')).toBe('false');
  });

  it('shows no family selector outside the logic axis nor on the discovery briefing', () => {
    expect(
      render(AxisType.MEMORY).nativeElement.querySelectorAll(
        '.axis-briefing__family-segment',
      ),
    ).toHaveLength(0);
    expect(
      render(AxisType.LOGIC, { tutorial: true }).nativeElement.querySelectorAll(
        '.axis-briefing__family-segment',
      ),
    ).toHaveLength(0);
  });

  it('reserves the pairing card and the crank note for the motricity axis outside discovery', () => {
    const targeted = render(AxisType.MOTOR_SKILLS, { showPairing: true });
    expect(
      targeted.nativeElement.querySelector('.axis-briefing__card--pairing'),
    ).not.toBeNull();
    expect(targeted.nativeElement.textContent).toContain('Manivelles tactiles');

    const discovery = render(AxisType.MOTOR_SKILLS, { tutorial: true });
    expect(
      discovery.nativeElement.querySelector('.axis-briefing__card--pairing'),
    ).toBeNull();
    expect(discovery.nativeElement.textContent).not.toContain(
      'Manivelles tactiles',
    );

    const otherAxis = render(AxisType.LOGIC);
    expect(otherAxis.nativeElement.textContent).not.toContain(
      'Manivelles tactiles',
    );
  });
});
