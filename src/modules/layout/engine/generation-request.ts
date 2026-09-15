import { Layout } from './model';

export interface RoomSpec {
  type: string;
  count: number;
  minMm2: number;
  idealMm2: number;
  maxMm2: number;
  minSideMm: number;
  extras?: Record<string, unknown>;
}

export interface KitchenSpec {
  minMm2: number;
  idealMm2: number;
  maxMm2: number;
  counterMinMm: number;
}

export interface BathConnectivitySpec {
  ensuite: boolean;
  commonBaths: number;
  wcPerFloor: number;
}

export interface ParkingSpec {
  required: boolean;
  cars: number;
}

export interface MandatorySpec {
  attachedBathrooms: boolean;
  indoorParking: ParkingSpec;
}

export interface StairSpec {
  widthMm: number;
  depthMm: number;
}

export interface RoomOverride {
  type: string;
  roomId?: string;
  minMm2?: number;
  idealMm2?: number;
  maxMm2?: number;
}

export interface ChangeRequest {
  overrideRooms?: RoomOverride[];
  addRooms?: RoomSpec[];
  removeTypes?: string[];
  maxCoverage?: number | null;
}

export interface GenerationRequest {
  plot: { widthMm: number; depthMm: number };
  openSides: number;
  wallThicknessMm: number;
  circulationRatio: number;
  doorWidthMm: number;
  staircase: StairSpec;
  floors: number;
  rooms: RoomSpec[];
  kitchen: KitchenSpec;
  bathConnectivity: BathConnectivitySpec;
  mandatory: MandatorySpec;
  maxCoverage: number | null;
  seed?: number;
  parent?: Layout;
  changeRequest?: ChangeRequest;
}

export const DEFAULT_STAIR: StairSpec = { widthMm: 1000, depthMm: 2500 };
export const DEFAULT_WALL_THICKNESS_MM = 229;
export const DEFAULT_DOOR_WIDTH_MM = 900;
export const DEFAULT_CIRCULATION_RATIO = 0.08;
