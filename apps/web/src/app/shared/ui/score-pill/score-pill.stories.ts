import type { Meta, StoryObj } from '@storybook/angular';
import { ScorePill } from './score-pill';

const meta: Meta<ScorePill> = {
  title: 'Design System/Score Pill',
  component: ScorePill,
  tags: ['autodocs'],
  argTypes: {
    score: { control: { type: 'number', min: 0, max: 100, step: 1 } },
  },
  args: {
    score: 92,
  },
};
export default meta;

type Story = StoryObj<ScorePill>;

export const Excellent: Story = { args: { score: 92 } };
export const Acceptable: Story = { args: { score: 74 } };
export const Fragile: Story = { args: { score: 64 } };
export const Insufficient: Story = { args: { score: 48 } };
