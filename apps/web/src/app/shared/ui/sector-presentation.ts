import { Sector } from '@psychotech/shared';
import {
  Car,
  LucideIconData,
  Plane,
  Shield,
  Stethoscope,
  TrainFront,
} from 'lucide-angular';

export interface SectorPresentation {
  label: string;
  icon: LucideIconData;
}

export const SECTOR_PRESENTATION: Record<Sector, SectorPresentation> = {
  [Sector.RAILWAY]: { label: 'Ferroviaire', icon: TrainFront },
  [Sector.AVIATION]: { label: 'Aérien', icon: Plane },
  [Sector.SECURITY]: { label: 'Sécurité', icon: Shield },
  [Sector.DRIVING]: { label: 'Conduite', icon: Car },
  [Sector.HEALTHCARE]: { label: 'Santé', icon: Stethoscope },
};
