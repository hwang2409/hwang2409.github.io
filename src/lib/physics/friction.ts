// Unit mass on an infinite incline, equal static and kinetic coefficients.
export function inclineForces(degrees: number, friction: number) {
  const angle = degrees * Math.PI / 180;
  const normal = 9.81 * Math.cos(angle);
  const tangent = 9.81 * Math.sin(angle);
  return { angle, normal, tangent, ratio: tangent / normal, acceleration: Math.max(0, tangent - friction * normal) };
}
