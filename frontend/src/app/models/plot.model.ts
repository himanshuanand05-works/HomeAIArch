export type LengthUnit = 'M' | 'FT';

export interface PlotModel {
  id: string;
  ownerId: string;
  widthMm: number;
  depthMm: number;
  unit: LengthUnit;
  widthRaw: number;
  depthRaw: number;
  openSides: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlotPayload {
  ownerId: string;
  width: number;
  depth: number;
  unit: LengthUnit;
  openSides: number;
}

export interface UpdatePlotPayload {
  width?: number;
  depth?: number;
  unit?: LengthUnit;
  openSides?: number;
}

export interface PlotSnapshot {
  widthMm: number;
  depthMm: number;
  widthRaw: number;
  depthRaw: number;
  unit: LengthUnit;
  openSides: number;
}

export function formatMetres(mm: number): string {
  return `${(mm / 1000).toFixed(2)} m`;
}

export function formatSqMetres(mm2: number): string {
  return `${(mm2 / 1_000_000).toFixed(1)} m²`;
}
