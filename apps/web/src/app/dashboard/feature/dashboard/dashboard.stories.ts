import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Sector, UserProfileDto } from '@psychotech/shared';
import { applicationConfig } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { of } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { Dashboard } from './dashboard';

const mockUser: UserProfileDto = {
  id: 'user-1',
  email: 'camille@exemple.fr',
  firstName: 'Camille',
  lastName: 'Durand',
  locale: 'fr',
  timezone: 'Europe/Paris',
  currentSector: Sector.RAILWAY,
  createdAt: '2026-06-26T08:00:00.000Z',
};

const mockAuthFacade = {
  currentUser: signal<UserProfileDto | null>(mockUser),
  logout: () => of(undefined),
} as unknown as AuthFacade;

const meta: Meta<Dashboard> = {
  title: 'Pages/Dashboard',
  component: Dashboard,
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

type Story = StoryObj<Dashboard>;

export const Default: Story = {};
