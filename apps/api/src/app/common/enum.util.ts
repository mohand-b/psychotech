export function mapEnumValue<E extends Record<string, string>>(
  target: E,
  value: string,
): E[keyof E] {
  if (!Object.prototype.hasOwnProperty.call(target, value)) {
    throw new Error(`Unknown enum value: ${value}`);
  }
  return target[value as keyof E];
}
