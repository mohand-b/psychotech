import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { applicationConfig } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { of } from 'rxjs';
import { AuthFacade } from '../../data-access/auth.facade';
import { Login } from './login';

const mockAuthFacade = {
  pending: signal(false),
  login: () => of(null),
} as unknown as AuthFacade;

const meta: Meta<Login> = {
  title: 'Pages/Login',
  component: Login,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    applicationConfig({
      providers: [
        provideRouter([]),
        { provide: AuthFacade, useValue: mockAuthFacade },
      ],
    }),
  ],
};
export default meta;

type Story = StoryObj<Login>;

export const Default: Story = {};
