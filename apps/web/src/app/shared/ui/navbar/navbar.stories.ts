import { signal } from '@angular/core';
import { provideRouter, Routes } from '@angular/router';
import {
  EnergyStateDto,
  Sector,
  SubscriptionTier,
  UserProfileDto,
} from '@psychotech/shared';
import { applicationConfig } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { of } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
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

const energyState = (
  balance: number,
  tier: SubscriptionTier = SubscriptionTier.ESSENTIAL,
): EnergyStateDto => ({
  balance,
  capacity: 5,
  tier,
  resetsAt: '2026-06-28T00:00:00.000Z',
  canStartFull: balance >= 5,
  canStartAxis: balance >= 1,
});

const energyFacade = (state: EnergyStateDto | null): EnergyFacade =>
  ({ state: signal(state) }) as unknown as EnergyFacade;

const withEnergy = (state: EnergyStateDto | null) => [
  applicationConfig({
    providers: [{ provide: EnergyFacade, useValue: energyFacade(state) }],
  }),
];

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
        { provide: EnergyFacade, useValue: energyFacade(energyState(4)) },
      ],
    }),
  ],
};
export default meta;

type Story = StoryObj<Navbar>;

export const Desktop: Story = {};

export const DesktopEpuise: Story = {
  decorators: withEnergy(energyState(0)),
};

export const DesktopIllimite: Story = {
  decorators: withEnergy(energyState(5, SubscriptionTier.UNLIMITED)),
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
