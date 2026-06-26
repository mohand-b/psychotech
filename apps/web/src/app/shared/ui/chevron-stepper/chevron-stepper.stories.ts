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
    variant: { control: { type: 'radio' }, options: ['full', 'mini'] },
    axes: { control: { type: 'check' }, options: Object.values(AxisType) },
    currentIndex: { control: { type: 'number', min: 0, max: 8, step: 1 } },
    steps: { control: false },
  },
  args: {
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
