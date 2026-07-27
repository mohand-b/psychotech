import type { Meta, StoryObj } from '@storybook/angular';
import { AxisType } from '@psychotech/shared';
import { ChevronStepper } from './chevron-stepper';

const railwayAxes: AxisType[] = [
  AxisType.LOGIC,
  AxisType.MEMORY,
  AxisType.VISUAL_DISCRIMINATION,
  AxisType.REACTIVITY,
  AxisType.MOTOR_SKILLS,
];

const drivingAxes: AxisType[] = [
  AxisType.VISUAL_DISCRIMINATION,
  AxisType.REACTIVITY,
  AxisType.MOTOR_SKILLS,
  AxisType.ATTENTION,
];

const meta: Meta<ChevronStepper> = {
  title: 'Design System/Chevron Stepper',
  component: ChevronStepper,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    mode: { control: { type: 'radio' }, options: ['progress', 'explorer'] },
    variant: { control: { type: 'radio' }, options: ['full', 'mini'] },
    axes: { control: { type: 'check' }, options: Object.values(AxisType) },
    currentIndex: { control: { type: 'number', min: 0, max: 8, step: 1 } },
    steps: { control: false },
  },
  args: {
    mode: 'progress',
    variant: 'full',
    axes: railwayAxes,
    currentIndex: 3,
  },
};
export default meta;

type Story = StoryObj<ChevronStepper>;

export const Full: Story = {};
export const Mini: Story = { args: { variant: 'mini' } };
export const FreshStart: Story = { args: { currentIndex: 0 } };
export const Completed: Story = { args: { currentIndex: railwayAxes.length } };
export const DrivingSector: Story = {
  args: { axes: drivingAxes, currentIndex: 1 },
};
export const Explorer: Story = {
  args: { mode: 'explorer' },
  parameters: {
    docs: {
      description: {
        story:
          'Sélection persistante soulignée (défaut : premier axe). Survol = prévisualisation temporaire, clic = sélection, flèches gauche/droite au clavier.',
      },
    },
  },
};
export const ExplorerMini: Story = {
  args: { mode: 'explorer', variant: 'mini' },
};
