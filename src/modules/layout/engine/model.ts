export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Point {
  width: number;
  depth: number;
}

export type ConnectionKind = 'door' | 'passage' | 'stair';

export interface RoomProps {
  ensuiteBathId?: string | null;
  parkingCars?: number;
  counterMinMm?: number;
}

export interface Room {
  roomId: string;
  type: string;
  label: string;
  level: number;
  x: number;
  y: number;
  width: number;
  depth: number;
  externalGeometry: Rect;
  internalGeometry: Rect;
  areaMm2: number;
  props?: RoomProps;
}

export interface Floor {
  floorNumber: number;
  name: string;
  rooms: Room[];
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  kind: ConnectionKind;
  widthMm: number;
}

export interface PlotGeom {
  widthMm: number;
  depthMm: number;
  openSides: number;
}

export interface ScoreBreakdown {
  [key: string]: number;
}

export interface LayoutMetrics {
  builtUpAreaMm2: number;
  roomAreaMm2: number;
  plotCoverage: number;
  circulationMm2: number;
  score: number;
  scoreBreakdown: ScoreBreakdown;
}

export interface Layout {
  schemaVersion: number;
  unit: 'mm';
  resolutionMm: number;
  wallThicknessMm: number;
  plot: PlotGeom;
  floors: Floor[];
  connections: Connection[];
  metrics: LayoutMetrics;
}

export function areaOf(rect: Rect): number {
  return rect.width * rect.depth;
}

export function rectsOverlap(a: Rect, b: Rect, tolerance = 1): boolean {
  return (
    a.x < b.x + b.width - tolerance &&
    b.x < a.x + a.width - tolerance &&
    a.y < b.y + b.depth - tolerance &&
    b.y < a.y + a.depth - tolerance
  );
}

export function contactLength(a: Rect, b: Rect): number {
  const horizontalTouching = Math.abs(a.x + a.width - b.x) < 1 || Math.abs(b.x + b.width - a.x) < 1;
  const verticalTouching = Math.abs(a.y + a.depth - b.y) < 1 || Math.abs(b.y + b.depth - a.y) < 1;

  if (horizontalTouching) {
    const overlap = Math.min(a.y + a.depth, b.y + b.depth) - Math.max(a.y, b.y);
    return overlap > 0 ? overlap : 0;
  }
  if (verticalTouching) {
    const overlap = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
    return overlap > 0 ? overlap : 0;
  }
  return 0;
}
