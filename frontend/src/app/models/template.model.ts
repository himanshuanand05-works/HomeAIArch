export interface RoomBounds {
  minM2: number;
  idealM2: number;
  maxM2: number;
  minSideMm: number;
}

export interface StaircaseSpec {
  widthMm: number;
  depthMm: number;
}

export interface KitchenBounds extends RoomBounds {
  counterMinMm: number;
}

export interface BathDefaults {
  ensuite: RoomBounds;
  common: RoomBounds;
  wc: RoomBounds;
}

export interface ParkingSpec {
  required: boolean;
  cars: number;
}

export interface MandatoryDefaults {
  attachedBathrooms: boolean;
  indoorParking: ParkingSpec;
  outdoorParking: ParkingSpec;
}

export interface TemplateModel {
  id: string;
  slug: string;
  name: string;
  region: string | null;
  version: number;
  isActive: boolean;
  wallThicknessMm: number;
  wallNote: string | null;
  circulationRatio: number;
  doorWidthMm: number;
  staircase: StaircaseSpec;
  roomDefaults: Record<string, RoomBounds>;
  kitchenDefaults: KitchenBounds;
  bathDefaults: BathDefaults;
  mandatoryDefaults: MandatoryDefaults;
}

export interface TemplateSnapshot {
  slug: string;
  name: string;
  region: string | null;
  wallNote: string | null;
  wallThicknessMm: number;
  circulationRatio: number;
  doorWidthMm: number;
  staircase: StaircaseSpec;
  roomDefaults: Record<string, RoomBounds>;
  kitchenDefaults: KitchenBounds;
  bathDefaults: BathDefaults;
  mandatoryDefaults: MandatoryDefaults;
}
