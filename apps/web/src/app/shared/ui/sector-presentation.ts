import { Sector } from '@psychotech/shared';
import {
  Car,
  LucideIconData,
  Plane,
  Shield,
  Stethoscope,
  TrainFront,
} from 'lucide-angular';

interface SectorPresentation {
  label: string;
  icon: LucideIconData;
}

export interface SectorLineupEntry {
  sector: Sector;
  label: string;
}

export const SECTOR_LINEUP: readonly SectorLineupEntry[] = [
  { sector: Sector.RAILWAY, label: 'Ferroviaire' },
  { sector: Sector.AVIATION, label: 'Aviation' },
  { sector: Sector.SECURITY, label: 'Sécurité' },
  { sector: Sector.DRIVING, label: 'Conduite' },
  { sector: Sector.HEALTHCARE, label: 'Santé' },
];

export const SECTOR_PRESENTATION: Record<Sector, SectorPresentation> = {
  [Sector.RAILWAY]: { label: 'Ferroviaire', icon: TrainFront },
  [Sector.AVIATION]: { label: 'Aérien', icon: Plane },
  [Sector.SECURITY]: { label: 'Sécurité', icon: Shield },
  [Sector.DRIVING]: { label: 'Conduite', icon: Car },
  [Sector.HEALTHCARE]: { label: 'Santé', icon: Stethoscope },
};
