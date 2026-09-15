export type LengthUnit = 'M' | 'FT';

export const METERS_PER_FOOT = 0.3048;
export const GRID_METERS = 0.5;

export function toMeters(value: number, unit: LengthUnit): number {
  return unit === 'FT' ? value * METERS_PER_FOOT : value;
}

export function roundToGrid(value: number, grid: number = GRID_METERS): number {
  return Math.round(value / grid) * grid;
}

export function roundRectToGrid(value: number): number {
  return roundToGrid(value);
}
