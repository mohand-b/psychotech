import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  AXIS_COMMANDS,
  AxisType,
  RailwayPlayableAxis,
} from '@psychotech/shared';
import { AxisBriefing } from './axis-briefing';

const PLAYABLE_AXES = Object.keys(AXIS_COMMANDS) as RailwayPlayableAxis[];

function render(
  axis: RailwayPlayableAxis,
  tutorial: boolean,
): ComponentFixture<AxisBriefing> {
  const fixture = TestBed.createComponent(AxisBriefing);
  fixture.componentRef.setInput('axis', axis);
  fixture.componentRef.setInput('tutorial', tutorial);
  fixture.detectChanges();
  return fixture;
}

function commandsSection(fixture: ComponentFixture<AxisBriefing>): {
  label: string | null;
  lines: string[];
} {
  const element: HTMLElement = fixture.nativeElement;
  const labels = Array.from(
    element.querySelectorAll('.axis-briefing__label'),
  ).map((node) => node.textContent?.trim() ?? '');
  const lines = Array.from(
    element.querySelectorAll('.axis-briefing__command-text'),
  ).map((node) => node.textContent?.trim() ?? '');
  return { label: labels.includes('Commandes') ? 'Commandes' : null, lines };
}

describe('AxisBriefing (section Commandes)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AxisBriefing],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it.each(PLAYABLE_AXES)(
    'shows the commands of axis %s on the targeted briefing',
    (axis) => {
      const { label, lines } = commandsSection(render(axis, false));
      expect(label).toBe('Commandes');
      expect(lines).toEqual(AXIS_COMMANDS[axis].map(({ text }) => text));
      lines.forEach((line) => {
        expect(line.length).toBeGreaterThan(0);
      });
    },
  );

  it.each(PLAYABLE_AXES)(
    'shows the commands of axis %s on the discovery briefing',
    (axis) => {
      const { label, lines } = commandsSection(render(axis, true));
      expect(label).toBe('Commandes');
      expect(lines).toEqual(AXIS_COMMANDS[axis].map(({ text }) => text));
    },
  );

  it('announces the skip command on the memory briefing', () => {
    const { lines } = commandsSection(render(AxisType.MEMORY, false));
    expect(lines.join(' ')).toContain('passe un emplacement');
  });

  it('renders one icon per command line', () => {
    const fixture = render(AxisType.REACTIVITY, false);
    const element: HTMLElement = fixture.nativeElement;
    expect(
      element.querySelectorAll('.axis-briefing__command-icon'),
    ).toHaveLength(AXIS_COMMANDS[AxisType.REACTIVITY].length);
  });
});
