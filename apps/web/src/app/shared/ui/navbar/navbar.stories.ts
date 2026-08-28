import { provideRouter, Routes } from '@angular/router';
import { EnergyStateDto, Sector, UserProfileDto } from '@psychotech/shared';
import { applicationConfig } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { Navbar } from './navbar';

const mockUser: UserProfileDto = {
  id: 'user-1',
  email: 'camille@exemple.fr',
  firstName: 'Camille',
  lastName: 'Dupont',
  locale: 'fr',
  timezone: 'Europe/Paris',
  currentSector: Sector.RAILWAY,
  showInFeed: false,
  pendingEmail: null,
  passwordChangedAt: null,
  lastLoginAt: null,
  emailVerifiedAt: '2026-06-27T08:00:00.000Z',
  examGuideReadAt: null,
  logicGuideReadAt: null,
  createdAt: '2026-06-27T08:00:00.000Z',
};

const energyState = (balance: number): EnergyStateDto => ({
  balance,
  canStartFull: balance >= 5,
  canStartAxis: balance >= 1,
});

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
  args: {
    user: mockUser,
    energy: energyState(5),
  },
  decorators: [
    applicationConfig({
      providers: [provideRouter(sectionRoutes)],
    }),
  ],
};
export default meta;

type Story = StoryObj<Navbar>;

export const Desktop: Story = {};

export const DesktopEpuise: Story = {
  args: { energy: energyState(0) },
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
