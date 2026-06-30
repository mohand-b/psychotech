import { AxisType } from '@psychotech/shared';
import { ButtonColor } from '../../shared/ui/button/button';

const AXIS_BUTTON_COLOR: Partial<Record<AxisType, ButtonColor>> = {
  [AxisType.LOGIC]: 'logic',
  [AxisType.MEMORY]: 'memory',
  [AxisType.VISUAL_DISCRIMINATION]: 'discrimination',
  [AxisType.REACTIVITY]: 'reactivity',
  [AxisType.MOTOR_SKILLS]: 'motor',
};

export function axisButtonColor(axis: AxisType): ButtonColor {
  return AXIS_BUTTON_COLOR[axis] ?? 'brand';
}
