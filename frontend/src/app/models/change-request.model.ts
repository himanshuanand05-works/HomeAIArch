export interface OverrideRoomInput {
  type: string;
  minMm2?: number;
  idealMm2?: number;
  maxMm2?: number;
}

export interface AddRoomInput {
  type: string;
  count: number;
  minMm2?: number;
  idealMm2?: number;
  maxMm2?: number;
  minSideMm?: number;
}

export interface ChangeRequest {
  overrideRooms?: OverrideRoomInput[];
  addRooms?: AddRoomInput[];
  removeTypes?: string[];
  maxCoverage?: number | null;
}

export interface IteratePayload {
  changeRequest: ChangeRequest;
  seed?: number | null;
}

export interface ConstraintViolation {
  constraint: string;
  room?: string;
  expected?: string;
  actual?: string;
  hint?: string;
}
