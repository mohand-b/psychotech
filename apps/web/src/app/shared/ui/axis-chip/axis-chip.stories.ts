import type { Meta, StoryObj } from '@storybook/angular';
import { AxisType } from '@psychotech/shared';
import { AxisChip } from './axis-chip';

const meta: Meta<AxisChip> = {
  title: 'Design System/Axis Chip',
  component: AxisChip,
  tags: ['autodocs'],
  argTypes: {
    axis: { control: { type: 'select' }, options: Object.values(AxisType) },
  },
  args: {
    axis: AxisType.LOGIC,
  },
};
export default meta;

type Story = StoryObj<AxisChip>;

export const Logic: Story = {};
export const Reactivity: Story = { args: { axis: AxisType.REACTIVITY } };
export const Spatial: Story = { args: { axis: AxisType.SPATIAL } };
