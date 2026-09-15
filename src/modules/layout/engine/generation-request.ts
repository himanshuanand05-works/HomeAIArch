import { Layout } from './model';

export interface RoomSpec {
  type: string;
  count: number;
  minM2: number;
  idealM2: number;
  maxM2: number;
  extras?: Record<string, unknown>;
}

export interface KitchenSpec {
  minM2: number;
  idealM2: number;
  maxM2: number;
  counterMinM: number;
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
  widthM: number;
  depthM: number;
}

export interface RoomOverride {
  type: string;
  roomId?: string;
  minM2?: number;
  idealM2?: number;
  maxM2?: number;
}

export interface ChangeRequest {
  overrideRooms?: RoomOverride[];
  addRooms?: RoomSpec[];
  removeTypes?: string[];
  maxCoverage?: number | null;
}

export interface GenerationRequest {
  plot: { widthM: number; depthM: number };
  openSides: number;
  wallThicknessM: number;
  circulationRatio: number;
  doorWidthM: number;
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

export const DEFAULT_STAIR: StairSpec = { widthM: 1.0, depthM: 2.5 };
export const DEFAULT_WALL_THICKNESS_M = 0.2286;
export const DEFAULT_DOOR_WIDTH_M = 0.9;
export const DEFAULT_CIRCULATION_RATIO = 0.08;
