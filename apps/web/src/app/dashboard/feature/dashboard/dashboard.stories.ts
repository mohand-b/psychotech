import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { applicationConfig } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { Dashboard } from './dashboard';

const meta: Meta<Dashboard> = {
  title: 'Pages/Dashboard',
  component: Dashboard,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    applicationConfig({
      providers: [provideRouter([]), provideHttpClient()],
    }),
  ],
};
export default meta;

type Story = StoryObj<Dashboard>;

export const Default: Story = {};
