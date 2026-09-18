export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function constrainPhoto(
  scale: number,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const zoom = clamp(scale, 1, 4);
  if (zoom === 1) return { scale: 1, x: 0, y: 0 };
  return {
    scale: zoom,
    x: clamp(x, (-width * (zoom - 1)) / 2, (width * (zoom - 1)) / 2),
    y: clamp(y, (-height * (zoom - 1)) / 2, (height * (zoom - 1)) / 2),
  };
}

export function photoSwipe(dx: number, dy: number, scale: number): number {
  if (scale > 1 || Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy) * 1.2)
    return 0;
  return dx < 0 ? 1 : -1;
}
