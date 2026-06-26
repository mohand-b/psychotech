import type { Meta, StoryObj } from '@storybook/angular';
import { UiKit } from './ui-kit';

const meta: Meta<UiKit> = {
  title: 'Pages/UI Kit',
  component: UiKit,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<UiKit>;

export const Default: Story = {};
