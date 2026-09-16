export interface Rect {
  x: number;
  y: number;
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

export type ScoreBreakdown = Record<string, number>;

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

export interface DesignVersionSummary {
  id: string;
  projectId: string;
  versionNumber: number;
  parentId: string | null;
  status: string;
  metrics: LayoutMetrics | null;
  diagnostics: { elapsedMs?: number } | null;
  createdAt: string;
}

export interface DesignView {
  id: string;
  projectId: string;
  versionNumber: number;
  parentId: string | null;
  status: string;
  changeRequest: unknown;
  layout: Layout;
  metrics: LayoutMetrics;
  diagnostics: { elapsedMs?: number } | null;
  seed: number | null;
  createdAt: string;
}

export interface GenerateDesignPayload {
  seed?: number | null;
}

export function roomTypesIn(layout: Layout): string[] {
  const set = new Set<string>();
  for (const floor of layout.floors) {
    for (const room of floor.rooms) {
      set.add(room.type);
    }
  }
  return [...set];
}
