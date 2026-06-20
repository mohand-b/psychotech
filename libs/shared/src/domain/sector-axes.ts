import { AxisType, Sector } from '../enums';

export const SECTOR_AXES: Record<Sector, AxisType[]> = {
  [Sector.RAILWAY]: [
    AxisType.LOGIC,
    AxisType.MEMORY,
    AxisType.VISUAL_DISCRIMINATION,
    AxisType.REACTIVITY,
    AxisType.MOTOR_SKILLS,
  ],
  [Sector.DRIVING]: [
    AxisType.VISUAL_DISCRIMINATION,
    AxisType.REACTIVITY,
    AxisType.MOTOR_SKILLS,
    AxisType.ATTENTION,
  ],
  [Sector.AVIATION]: [
    AxisType.LOGIC,
    AxisType.MEMORY,
    AxisType.MOTOR_SKILLS,
    AxisType.ATTENTION,
    AxisType.NUMERICAL,
    AxisType.VERBAL,
    AxisType.SPATIAL,
  ],
  [Sector.SECURITY]: [
    AxisType.LOGIC,
    AxisType.MEMORY,
    AxisType.ATTENTION,
    AxisType.NUMERICAL,
    AxisType.VERBAL,
    AxisType.SPATIAL,
  ],
  [Sector.HEALTHCARE]: [
    AxisType.LOGIC,
    AxisType.ATTENTION,
    AxisType.NUMERICAL,
    AxisType.VERBAL,
  ],
};
