import { TemplateSnapshot } from './template.model';

export interface ProfileRoomInput {
  type: string;
  count?: number;
  minM2?: number;
  idealM2?: number;
  maxM2?: number;
  minSideM?: number;
}

export interface KitchenInput {
  minM2?: number;
  idealM2?: number;
  maxM2?: number;
  counterMinM?: number;
}

export interface BathConnectivityInput {
  ensuite?: boolean;
  commonBaths?: number;
  wcPerFloor?: number;
}

export interface ParkingInput {
  required?: boolean;
  cars?: number;
}

export interface MandatoryInput {
  attachedBathrooms?: boolean;
  indoorParking?: ParkingInput;
  outdoorParking?: ParkingInput;
}

export interface CreateProfilePayload {
  userId: string;
  name: string;
  templateId: string;
  floors: number;
  rooms: ProfileRoomInput[];
  kitchen?: KitchenInput;
  bathConnectivity?: BathConnectivityInput;
  mandatory?: MandatoryInput;
  maxCoverage?: number | null;
}

export type UpdateProfilePayload = Partial<CreateProfilePayload>;

export interface SnapshotRoom {
  type: string;
  count: number;
  minM2: number;
  idealM2: number;
  maxM2: number;
  minSideMm: number;
}

export interface SnapshotKitchen {
  minM2: number;
  idealM2: number;
  maxM2: number;
  counterMinMm: number;
}

export interface SnapshotBathConnectivity {
  ensuite: boolean;
  commonBaths: number;
  wcPerFloor: number;
}

export interface SnapshotMandatory {
  attachedBathrooms: boolean;
  indoorParking: ParkingSpecLike;
  outdoorParking: ParkingSpecLike;
}

export interface ParkingSpecLike {
  required: boolean;
  cars: number;
}

export interface ProfileModel {
  id: string;
  userId: string;
  name: string;
  templateId: string | null;
  floors: number;
  rooms: SnapshotRoom[];
  kitchen: SnapshotKitchen;
  bathConnectivity: SnapshotBathConnectivity;
  mandatoryRequirements: SnapshotMandatory;
  maxCoverage: number | null;
  templateSnapshot: TemplateSnapshot;
  createdAt: string;
  updatedAt: string;
}

export function squareMetresInput(mm2: number): number {
  return Number((mm2 / 1_000_000).toFixed(2));
}

export function squareMillimetresInput(m2: number): number {
  return Math.round(m2 * 1_000_000);
}
