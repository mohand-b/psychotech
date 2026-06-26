import type { Meta, StoryObj } from '@storybook/angular';
import { AxisType } from '@psychotech/shared';
import { ChevronStep, ChevronStepper } from './chevron-stepper';

const railwaySteps: ChevronStep[] = [
  { axis: AxisType.LOGIC, state: 'done' },
  { axis: AxisType.MEMORY, state: 'done' },
  { axis: AxisType.VISUAL_DISCRIMINATION, state: 'done' },
  { axis: AxisType.REACTIVITY, state: 'current' },
  { axis: AxisType.MOTOR_SKILLS, state: 'todo' },
];

const freshStart: ChevronStep[] = [
  { axis: AxisType.LOGIC, state: 'current' },
  { axis: AxisType.MEMORY, state: 'todo' },
  { axis: AxisType.VISUAL_DISCRIMINATION, state: 'todo' },
  { axis: AxisType.REACTIVITY, state: 'todo' },
  { axis: AxisType.MOTOR_SKILLS, state: 'todo' },
];

const allDone: ChevronStep[] = railwaySteps.map((step) => ({
  axis: step.axis,
  state: 'done',
}));

const meta: Meta<ChevronStepper> = {
  title: 'Design System/Chevron Stepper',
  component: ChevronStepper,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    variant: { control: { type: 'radio' }, options: ['full', 'mini'] },
    steps: { control: 'object' },
  },
  args: {
    variant: 'full',
    steps: railwaySteps,
  },
};
export default meta;

type Story = StoryObj<ChevronStepper>;

export const Full: Story = {};
export const Mini: Story = { args: { variant: 'mini' } };
export const FreshStart: Story = { args: { steps: freshStart } };
export const AllDone: Story = { args: { steps: allDone } };
export const MiniFreshStart: Story = {
  args: { variant: 'mini', steps: freshStart },
};
