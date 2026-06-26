import { provideRouter } from '@angular/router';
import { applicationConfig } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { Landing } from './landing';

const meta: Meta<Landing> = {
  title: 'Pages/Landing',
  component: Landing,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [applicationConfig({ providers: [provideRouter([])] })],
};
export default meta;

type Story = StoryObj<Landing>;

export const Default: Story = {};
