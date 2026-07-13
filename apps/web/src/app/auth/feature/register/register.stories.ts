import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Sector, SectorSummaryDto } from '@psychotech/shared';
import { applicationConfig } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { of } from 'rxjs';
import { CatalogFacade } from '../../../catalog/data-access/catalog.facade';
import { AuthFacade } from '../../data-access/auth.facade';
import { Register } from './register';

const mockSectors: SectorSummaryDto[] = [
  { code: Sector.RAILWAY, label: 'Ferroviaire', isActive: true },
  { code: Sector.AVIATION, label: 'Aérien', isActive: false },
  { code: Sector.DRIVING, label: 'Conduite', isActive: false },
  { code: Sector.HEALTHCARE, label: 'Santé', isActive: false },
  { code: Sector.SECURITY, label: 'Sécurité', isActive: false },
];

const mockAuthFacade = {
  pending: signal(false),
  register: () => of(null),
} as unknown as AuthFacade;

const mockCatalogFacade = {
  sectors: signal(mockSectors),
  sectorsError: signal(null),
} as unknown as CatalogFacade;

const meta: Meta<Register> = {
  title: 'Pages/Register',
  component: Register,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    applicationConfig({
      providers: [
        provideRouter([]),
        { provide: AuthFacade, useValue: mockAuthFacade },
        { provide: CatalogFacade, useValue: mockCatalogFacade },
      ],
    }),
  ],
};
export default meta;

type Story = StoryObj<Register>;

export const Default: Story = {};
