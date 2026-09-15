export interface RoomKindDefaults {
  label: string;
  minMm2: number;
  idealMm2: number;
  maxMm2: number;
  minSideMm: number;
}

export const ROOM_KIND_DEFAULTS: Record<string, RoomKindDefaults> = {
  living: {
    label: 'Living Room',
    minMm2: 12_000_000,
    idealMm2: 18_000_000,
    maxMm2: 30_000_000,
    minSideMm: 3000,
  },
  dining: {
    label: 'Dining Area',
    minMm2: 9_000_000,
    idealMm2: 12_000_000,
    maxMm2: 18_000_000,
    minSideMm: 2400,
  },
  kitchen: {
    label: 'Kitchen',
    minMm2: 7_000_000,
    idealMm2: 10_000_000,
    maxMm2: 16_000_000,
    minSideMm: 2100,
  },
  bed1: {
    label: 'Master Bedroom',
    minMm2: 13_400_000,
    idealMm2: 18_000_000,
    maxMm2: 30_000_000,
    minSideMm: 3300,
  },
  bed2: {
    label: 'Bedroom 2',
    minMm2: 10_000_000,
    idealMm2: 14_000_000,
    maxMm2: 22_000_000,
    minSideMm: 3000,
  },
  bed3: {
    label: 'Bedroom 3',
    minMm2: 9_000_000,
    idealMm2: 12_000_000,
    maxMm2: 18_000_000,
    minSideMm: 2800,
  },
  bed4: {
    label: 'Bedroom 4',
    minMm2: 8_000_000,
    idealMm2: 10_000_000,
    maxMm2: 15_000_000,
    minSideMm: 2400,
  },
  bath: {
    label: 'Bathroom',
    minMm2: 2_400_000,
    idealMm2: 3_600_000,
    maxMm2: 6_000_000,
    minSideMm: 1500,
  },
  wc: { label: 'W.C.', minMm2: 1_200_000, idealMm2: 1_800_000, maxMm2: 3_000_000, minSideMm: 1000 },
  study: {
    label: 'Study',
    minMm2: 6_000_000,
    idealMm2: 9_000_000,
    maxMm2: 14_000_000,
    minSideMm: 2400,
  },
  store: {
    label: 'Store',
    minMm2: 3_000_000,
    idealMm2: 4_500_000,
    maxMm2: 8_000_000,
    minSideMm: 1500,
  },
  utility: {
    label: 'Utility',
    minMm2: 4_000_000,
    idealMm2: 6_000_000,
    maxMm2: 10_000_000,
    minSideMm: 2000,
  },
  lobby: {
    label: 'Lobby',
    minMm2: 4_000_000,
    idealMm2: 6_000_000,
    maxMm2: 10_000_000,
    minSideMm: 1800,
  },
  parking: {
    label: 'Parking',
    minMm2: 12_500_000,
    idealMm2: 16_000_000,
    maxMm2: 25_000_000,
    minSideMm: 2400,
  },
};

export function kindDefaultsFor(type: string): RoomKindDefaults | null {
  return ROOM_KIND_DEFAULTS[type] ?? null;
}

export function labelFor(type: string): string {
  return kindDefaultsFor(type)?.label ?? type;
}
