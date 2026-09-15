export interface RoomKindDefaults {
  label: string;
  minM2: number;
  idealM2: number;
  maxM2: number;
  minSideM: number;
}

export const ROOM_KIND_DEFAULTS: Record<string, RoomKindDefaults> = {
  living: { label: 'Living Room', minM2: 12, idealM2: 18, maxM2: 30, minSideM: 3.0 },
  dining: { label: 'Dining Area', minM2: 9, idealM2: 12, maxM2: 18, minSideM: 2.4 },
  kitchen: { label: 'Kitchen', minM2: 7, idealM2: 10, maxM2: 16, minSideM: 2.1 },
  bed1: { label: 'Master Bedroom', minM2: 13.4, idealM2: 18, maxM2: 30, minSideM: 3.3 },
  bed2: { label: 'Bedroom 2', minM2: 10, idealM2: 14, maxM2: 22, minSideM: 3.0 },
  bed3: { label: 'Bedroom 3', minM2: 9, idealM2: 12, maxM2: 18, minSideM: 2.8 },
  bed4: { label: 'Bedroom 4', minM2: 8, idealM2: 10, maxM2: 15, minSideM: 2.4 },
  bath: { label: 'Bathroom', minM2: 2.4, idealM2: 3.6, maxM2: 6, minSideM: 1.5 },
  wc: { label: 'W.C.', minM2: 1.2, idealM2: 1.8, maxM2: 3, minSideM: 1.0 },
  study: { label: 'Study', minM2: 6, idealM2: 9, maxM2: 14, minSideM: 2.4 },
  store: { label: 'Store', minM2: 3, idealM2: 4.5, maxM2: 8, minSideM: 1.5 },
  utility: { label: 'Utility', minM2: 4, idealM2: 6, maxM2: 10, minSideM: 2.0 },
  lobby: { label: 'Lobby', minM2: 4, idealM2: 6, maxM2: 10, minSideM: 1.8 },
  parking: { label: 'Parking', minM2: 12.5, idealM2: 16, maxM2: 25, minSideM: 2.4 },
};

export function kindDefaultsFor(type: string): RoomKindDefaults | null {
  return ROOM_KIND_DEFAULTS[type] ?? null;
}

export function labelFor(type: string): string {
  return kindDefaultsFor(type)?.label ?? type;
}
