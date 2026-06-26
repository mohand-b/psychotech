import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { AxisType } from '@psychotech/shared';
import { Badge } from './badge';

type BadgeStoryArgs = Badge & { label: string };

const meta: Meta<BadgeStoryArgs> = {
  title: 'Design System/Badge',
  component: Badge,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [Badge] })],
  argTypes: {
    tone: { control: { type: 'radio' }, options: ['brand', 'neutral'] },
    axis: {
      control: { type: 'select' },
      options: [null, ...Object.values(AxisType)],
    },
    label: { control: 'text' },
  },
  args: {
    tone: 'brand',
    axis: null,
    label: 'Recommandé',
  },
  render: (args) => ({
    props: args,
    template: `<ui-badge [tone]="tone" [axis]="axis">{{ label }}</ui-badge>`,
  }),
};
export default meta;

type Story = StoryObj<BadgeStoryArgs>;

export const Brand: Story = {};
export const Neutral: Story = { args: { tone: 'neutral', label: 'À venir' } };
export const AxisColored: Story = {
  args: { axis: AxisType.LOGIC, label: 'Logique' },
};
