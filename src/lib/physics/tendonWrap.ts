export type Point = { x: number; y: number };
export const PEG_RADIUS = 0.55;
export const ANCHOR: Point = { x: -2, y: 0 };
export const LINK_PIVOT: Point = { x: 1.7, y: 1.4 };
export const LINK_LENGTH = 1.5;
export type WrapPath = { end: Point; startAngle: number; endAngle: number; wrapped: boolean; length: number };

export function tendonWrap(angle: number): WrapPath {
  const end = { x: LINK_PIVOT.x + LINK_LENGTH * Math.sin(angle), y: LINK_PIVOT.y - LINK_LENGTH * Math.cos(angle) };
  const dx = end.x - ANCHOR.x, dy = end.y - ANCHOR.y;
  const distance = Math.hypot(dx, dy);
  const t = Math.max(0, Math.min(1, -(ANCHOR.x * dx + ANCHOR.y * dy) / distance ** 2));
  const closest = Math.hypot(ANCHOR.x + t * dx, ANCHOR.y + t * dy);
  const da = Math.hypot(ANCHOR.x, ANCHOR.y), db = Math.hypot(end.x, end.y);
  if (closest >= PEG_RADIUS || db <= PEG_RADIUS) {
    return { end, startAngle: 0, endAngle: 0, wrapped: false, length: distance };
  }
  // Shortest of the clockwise/counterclockwise tangent–arc–tangent paths.
  const side = end.y >= 0 ? 1 : -1;
  const gamma = Math.acos(Math.max(-1, Math.min(1, -end.x / db)));
  const phiA = Math.acos(PEG_RADIUS / da), phiB = Math.acos(PEG_RADIUS / db);
  const arc = Math.max(0, gamma - phiA - phiB);
  const startAngle = side * (Math.PI - phiA);
  return { end, startAngle, endAngle: startAngle - side * arc, wrapped: true,
    length: Math.sqrt(da * da - PEG_RADIUS ** 2) + PEG_RADIUS * arc + Math.sqrt(db * db - PEG_RADIUS ** 2) };
}
