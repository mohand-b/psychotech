import { AxisType, Sector } from '../enums';

export const SECTOR_LABELS: Record<Sector, string> = {
  [Sector.RAILWAY]: 'Ferroviaire',
  [Sector.AVIATION]: 'Aérien',
  [Sector.SECURITY]: 'Sécurité',
  [Sector.DRIVING]: 'Conduite',
  [Sector.HEALTHCARE]: 'Santé',
};

export const SECTOR_AXES: Record<Sector, AxisType[]> = {
  [Sector.RAILWAY]: [
    AxisType.VISUAL_DISCRIMINATION,
    AxisType.LOGIC,
    AxisType.MEMORY,
    AxisType.MOTOR_SKILLS,
    AxisType.REACTIVITY,
  ],
  [Sector.DRIVING]: [
    AxisType.ATTENTION,
    AxisType.VISUAL_DISCRIMINATION,
    AxisType.MOTOR_SKILLS,
    AxisType.REACTIVITY,
  ],
  [Sector.AVIATION]: [
    AxisType.ATTENTION,
    AxisType.LOGIC,
    AxisType.MEMORY,
    AxisType.MOTOR_SKILLS,
    AxisType.NUMERICAL,
    AxisType.SPATIAL,
    AxisType.VERBAL,
  ],
  [Sector.SECURITY]: [
    AxisType.ATTENTION,
    AxisType.LOGIC,
    AxisType.MEMORY,
    AxisType.NUMERICAL,
    AxisType.SPATIAL,
    AxisType.VERBAL,
  ],
  [Sector.HEALTHCARE]: [
    AxisType.ATTENTION,
    AxisType.LOGIC,
    AxisType.NUMERICAL,
    AxisType.VERBAL,
  ],
};
