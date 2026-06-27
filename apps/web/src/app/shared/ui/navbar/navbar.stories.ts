import { signal } from '@angular/core';
import { provideRouter, Routes } from '@angular/router';
import { Sector, UserProfileDto } from '@psychotech/shared';
import { applicationConfig } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { of } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { Navbar } from './navbar';

const mockUser: UserProfileDto = {
  id: 'user-1',
  email: 'mohand@exemple.fr',
  firstName: 'Mohand',
  lastName: 'Boudjema',
  locale: 'fr',
  timezone: 'Europe/Paris',
  currentSector: Sector.RAILWAY,
  createdAt: '2026-06-27T08:00:00.000Z',
};

const mockAuthFacade = {
  currentUser: signal<UserProfileDto | null>(mockUser),
  logout: () => of(undefined),
} as unknown as AuthFacade;

const sectionRoutes: Routes = [
  { path: 'dashboard', children: [] },
  { path: 'entrainements', children: [] },
  { path: 'sessions', children: [] },
  { path: 'progression', children: [] },
  { path: '**', redirectTo: 'dashboard' },
];

const meta: Meta<Navbar> = {
  title: 'Design System/Navbar',
  component: Navbar,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    applicationConfig({
      providers: [
        provideRouter(sectionRoutes),
        { provide: AuthFacade, useValue: mockAuthFacade },
      ],
    }),
  ],
  argTypes: {
    streakActive: { control: 'boolean' },
    streakCount: { control: { type: 'number', min: 0, max: 999, step: 1 } },
  },
  args: {
    streakActive: true,
    streakCount: 12,
  },
};
export default meta;

type Story = StoryObj<Navbar>;

export const Desktop: Story = {};

export const DesktopSerieInactive: Story = {
  args: { streakActive: false, streakCount: 0 },
};

export const Mobile: Story = {
  parameters: {
    viewport: {
      options: {
        mobile: {
          name: 'Mobile 390',
          styles: { width: '390px', height: '844px' },
          type: 'mobile',
        },
      },
    },
  },
  globals: { viewport: { value: 'mobile' } },
};
