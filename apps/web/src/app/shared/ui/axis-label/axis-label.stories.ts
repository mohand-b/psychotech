import type { Meta, StoryObj } from '@storybook/angular';
import { AxisType } from '@psychotech/shared';
import { AxisLabel } from './axis-label';

const meta: Meta<AxisLabel> = {
  title: 'Design System/Axis Label',
  component: AxisLabel,
  tags: ['autodocs'],
  argTypes: {
    axis: { control: { type: 'select' }, options: Object.values(AxisType) },
  },
  args: {
    axis: AxisType.LOGIC,
  },
};
export default meta;

type Story = StoryObj<AxisLabel>;

export const Logic: Story = {};
export const Memory: Story = { args: { axis: AxisType.MEMORY } };
export const VisualDiscrimination: Story = {
  args: { axis: AxisType.VISUAL_DISCRIMINATION },
};
export const Reactivity: Story = { args: { axis: AxisType.REACTIVITY } };
export const MotorSkills: Story = { args: { axis: AxisType.MOTOR_SKILLS } };
export const CompactDiscrimination: Story = {
  args: { axis: AxisType.VISUAL_DISCRIMINATION, compact: true },
};
