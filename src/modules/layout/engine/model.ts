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
  counterMinM?: number;
}

export interface Room extends Rect {
  roomId: string;
  type: string;
  label: string;
  level: number;
  areaM2: number;
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
  width: number;
}

export interface PlotGeom {
  width: number;
  depth: number;
  openSides: number;
}

export interface ScoreBreakdown {
  [key: string]: number;
}

export interface LayoutMetrics {
  builtUpAreaM2: number;
  roomAreaM2: number;
  plotCoverage: number;
  circulationM2: number;
  score: number;
  scoreBreakdown: ScoreBreakdown;
}

export interface Layout {
  schemaVersion: number;
  unit: 'meters';
  resolution: number;
  wallThicknessM: number;
  plot: PlotGeom;
  floors: Floor[];
  connections: Connection[];
  metrics: LayoutMetrics;
}

export function areaOf(rect: Rect): number {
  return rect.width * rect.depth;
}

export function rectsOverlap(a: Rect, b: Rect, tolerance = 0.01): boolean {
  return (
    a.x < b.x + b.width - tolerance &&
    b.x < a.x + a.width - tolerance &&
    a.y < b.y + b.depth - tolerance &&
    b.y < a.y + a.depth - tolerance
  );
}

export function contactLength(a: Rect, b: Rect): number {
  const horizontalTouching =
    Math.abs(a.x + a.width - b.x) < 0.01 || Math.abs(b.x + b.width - a.x) < 0.01;
  const verticalTouching =
    Math.abs(a.y + a.depth - b.y) < 0.01 || Math.abs(b.y + b.depth - a.y) < 0.01;

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
