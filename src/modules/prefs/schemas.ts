import { z } from 'zod';

export const ProfileRoomSpecSchema = z.object({
  type: z
    .string()
    .regex(/^[a-z0-9_]+$/)
    .min(1),
  count: z.number().int().min(1).max(8).default(1),
  minM2: z.number().positive().default(8),
  idealM2: z.number().positive().default(12),
  maxM2: z.number().positive().default(20),
  minSideMm: z.number().int().positive().default(2400),
});

export type ProfileRoomSpec = z.infer<typeof ProfileRoomSpecSchema>;

const ChangeOverrideRoomSchema = z.object({
  type: z
    .string()
    .regex(/^[a-z0-9_]+$/)
    .min(1),
  minMm2: z.number().int().positive().optional(),
  idealMm2: z.number().int().positive().optional(),
  maxMm2: z.number().int().positive().optional(),
});

const ChangeAddRoomSchema = z.object({
  type: z
    .string()
    .regex(/^[a-z0-9_]+$/)
    .min(1),
  count: z.number().int().min(1).max(8).default(1),
  minMm2: z.number().int().positive().default(6_000_000),
  idealMm2: z.number().int().positive().default(9_000_000),
  maxMm2: z.number().int().positive().default(15_000_000),
  minSideMm: z.number().int().positive().default(1800),
});

export const ChangeRequestSchema = z
  .object({
    overrideRooms: z.array(ChangeOverrideRoomSchema).optional(),
    addRooms: z.array(ChangeAddRoomSchema).optional(),
    removeTypes: z
      .array(
        z
          .string()
          .regex(/^[a-z0-9_]+$/)
          .min(1),
      )
      .optional(),
    maxCoverage: z.number().min(0).max(1).nullable().optional(),
  })
  .strict();

const roomBoundsSchema = z.object({
  minM2: z.number().positive(),
  idealM2: z.number().positive(),
  maxM2: z.number().positive(),
  minSideMm: z.number().int().positive(),
});

export const TemplateSnapshotSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  region: z.string().nullable(),
  wallNote: z.string().nullable(),
  wallThicknessMm: z.number().int().positive(),
  circulationRatio: z.number().min(0).max(0.5),
  doorWidthMm: z.number().int().positive(),
  staircase: z.object({
    widthMm: z.number().int().positive(),
    depthMm: z.number().int().positive(),
  }),
  roomDefaults: z.record(z.string(), roomBoundsSchema),
  kitchenDefaults: roomBoundsSchema.extend({ counterMinMm: z.number().int().positive() }),
  bathDefaults: z.object({
    ensuite: roomBoundsSchema,
    common: roomBoundsSchema,
    wc: roomBoundsSchema,
  }),
  mandatoryDefaults: z.object({
    attachedBathrooms: z.boolean(),
    indoorParking: z.object({ required: z.boolean(), cars: z.number().int().min(0) }),
    outdoorParking: z.object({ required: z.boolean(), cars: z.number().int().min(0) }),
  }),
});

export type TemplateSnapshot = z.infer<typeof TemplateSnapshotSchema>;

export const KitchenSpecSchema = z.object({
  minM2: z.number().positive(),
  idealM2: z.number().positive(),
  maxM2: z.number().positive(),
  counterMinMm: z.number().int().positive(),
});

export const BathConnectivitySchema = z.object({
  ensuite: z.boolean().default(true),
  commonBaths: z.number().int().min(0).max(4).default(1),
  wcPerFloor: z.number().int().min(0).max(2).default(1),
});

export const MandatoryRequirementsSchema = z.object({
  attachedBathrooms: z.boolean().default(true),
  indoorParking: z
    .object({
      required: z.boolean().default(false),
      cars: z.number().int().min(0).max(4).default(0),
    })
    .default({ required: false, cars: 0 }),
  outdoorParking: z
    .object({
      required: z.boolean().default(false),
      cars: z.number().int().min(0).max(4).default(0),
    })
    .default({ required: false, cars: 0 }),
});

export type MandatoryRequirements = z.infer<typeof MandatoryRequirementsSchema>;

export const PrefsSnapshotSchema = z.object({
  floors: z.number().int().min(1).max(3),
  rooms: z.array(ProfileRoomSpecSchema).min(1),
  kitchen: KitchenSpecSchema,
  bathConnectivity: BathConnectivitySchema,
  mandatory: MandatoryRequirementsSchema,
  maxCoverage: z.number().min(0).max(1).nullable().default(null),
  template: TemplateSnapshotSchema,
});

export type PrefsSnapshot = z.infer<typeof PrefsSnapshotSchema>;

export const PlotSnapshotSchema = z.object({
  widthMm: z.number().int().positive(),
  depthMm: z.number().int().positive(),
  widthRaw: z.number().positive(),
  depthRaw: z.number().positive(),
  unit: z.enum(['M', 'FT']),
  openSides: z.number().int().min(1).max(4),
});

export type PlotSnapshot = z.infer<typeof PlotSnapshotSchema>;
