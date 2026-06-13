export function mapEnumValue<E extends Record<string, string>>(
  target: E,
  value: string,
): E[keyof E] {
  return target[value as keyof E];
}
