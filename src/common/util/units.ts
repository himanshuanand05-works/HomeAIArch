export type LengthUnit = 'M' | 'FT';

export const METERS_PER_FOOT = 0.3048;
export const MILLIMETRES_PER_METRE = 1000;
export const MILLIMETRES_PER_FOOT = METERS_PER_FOOT * MILLIMETRES_PER_METRE;

export function toMeters(value: number, unit: LengthUnit): number {
  return unit === 'FT' ? value * METERS_PER_FOOT : value;
}

export function toMillimetres(value: number, unit: LengthUnit): number {
  return Math.round(toMeters(value, unit) * MILLIMETRES_PER_METRE);
}

export function metresToMillimetres(value: number): number {
  return Math.round(value * MILLIMETRES_PER_METRE);
}

export function squareMetresToSquareMillimetres(value: number): number {
  return Math.round(value * 1_000_000);
}
