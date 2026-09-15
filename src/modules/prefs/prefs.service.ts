import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { GenerationRequest } from '../layout/engine/generation-request';
import { ChangeRequestSchema, ProfileRoomSpec, ProfileRoomSpecSchema } from './schemas';

const roomBoundsSchema = z.object({
  minM2: z.number().positive(),
  idealM2: z.number().positive(),
  maxM2: z.number().positive(),
  minSideM: z.number().positive(),
});

export const TemplateSnapshotSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  region: z.string().nullable(),
  wallNote: z.string().nullable(),
  wallThicknessM: z.number().positive(),
  circulationRatio: z.number().min(0).max(0.5),
  doorWidthM: z.number().positive(),
  staircase: z.object({ widthM: z.number().positive(), depthM: z.number().positive() }),
  roomDefaults: z.record(z.string(), roomBoundsSchema),
  kitchenDefaults: roomBoundsSchema.extend({ counterMinM: z.number().positive() }),
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
  counterMinM: z.number().positive(),
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
  widthM: z.number().positive(),
  depthM: z.number().positive(),
  widthRaw: z.number().positive(),
  depthRaw: z.number().positive(),
  unit: z.enum(['M', 'FT']),
  openSides: z.number().int().min(1).max(4),
});

export type PlotSnapshot = z.infer<typeof PlotSnapshotSchema>;

const GENERIC_ROOM_BOUNDS = { minM2: 6, idealM2: 9, maxM2: 15, minSideM: 2 };

export interface ProfileRoomInput {
  type: string;
  count?: number;
  minM2?: number;
  idealM2?: number;
  maxM2?: number;
  minSideM?: number;
}

export interface PrefsInput {
  floors: number;
  rooms: ProfileRoomInput[];
  kitchen?: Partial<z.infer<typeof KitchenSpecSchema>>;
  bathConnectivity?: Partial<z.infer<typeof BathConnectivitySchema>>;
  mandatory?: Partial<MandatoryRequirements>;
  maxCoverage?: number | null;
}

export interface GenerationOverrides {
  seed?: number;
  parent?: GenerationRequest['parent'];
  changeRequest?: GenerationRequest['changeRequest'];
}

@Injectable()
export class PrefsService {
  parseTemplateSnapshot(value: unknown): TemplateSnapshot {
    return TemplateSnapshotSchema.parse(value);
  }

  parseChangeRequest(value: unknown): GenerationRequest['changeRequest'] {
    return ChangeRequestSchema.parse(value);
  }

  parsePrefsSnapshot(value: unknown): PrefsSnapshot {
    return PrefsSnapshotSchema.parse(value);
  }

  parsePlotSnapshot(value: unknown): PlotSnapshot {
    return PlotSnapshotSchema.parse(value);
  }

  parseSnapshotFields(
    rooms: unknown,
    kitchen: unknown,
    bathConnectivity: unknown,
    mandatory: unknown,
    maxCoverage: unknown,
  ): {
    rooms: ProfileRoomSpec[];
    kitchen: z.infer<typeof KitchenSpecSchema>;
    bathConnectivity: z.infer<typeof BathConnectivitySchema>;
    mandatory: MandatoryRequirements;
    maxCoverage: number | null;
  } {
    return {
      rooms: z.array(ProfileRoomSpecSchema).parse(rooms),
      kitchen: KitchenSpecSchema.parse(kitchen),
      bathConnectivity: BathConnectivitySchema.parse(bathConnectivity),
      mandatory: MandatoryRequirementsSchema.parse(mandatory),
      maxCoverage: maxCoverage === null ? null : z.number().min(0).max(1).parse(maxCoverage),
    };
  }

  buildPrefsSnapshot(template: TemplateSnapshot, input: PrefsInput): PrefsSnapshot {
    const kitchen =
      input.kitchen?.minM2 !== undefined
        ? {
            minM2: input.kitchen.minM2,
            idealM2: input.kitchen.idealM2 ?? input.kitchen.minM2,
            maxM2: input.kitchen.maxM2 ?? input.kitchen.minM2,
            counterMinM: input.kitchen.counterMinM ?? template.kitchenDefaults.counterMinM,
          }
        : template.kitchenDefaults;

    const bathConnectivity = {
      ensuite: input.bathConnectivity?.ensuite ?? template.mandatoryDefaults.attachedBathrooms,
      commonBaths: input.bathConnectivity?.commonBaths ?? 1,
      wcPerFloor: input.bathConnectivity?.wcPerFloor ?? 1,
    };

    const mandatory: MandatoryRequirements = {
      attachedBathrooms:
        input.mandatory?.attachedBathrooms ?? template.mandatoryDefaults.attachedBathrooms,
      indoorParking: {
        required:
          input.mandatory?.indoorParking?.required ??
          template.mandatoryDefaults.indoorParking.required,
        cars: input.mandatory?.indoorParking?.cars ?? template.mandatoryDefaults.indoorParking.cars,
      },
      outdoorParking: {
        required:
          input.mandatory?.outdoorParking?.required ??
          template.mandatoryDefaults.outdoorParking.required,
        cars:
          input.mandatory?.outdoorParking?.cars ?? template.mandatoryDefaults.outdoorParking.cars,
      },
    };

    const expandedRooms: ProfileRoomSpec[] = [];
    const seen = new Set<string>();
    for (const room of input.rooms) {
      const bounds = this.roomBoundsFor(template, room.type);
      expandedRooms.push({
        type: room.type,
        count: room.count ?? 1,
        minM2: room.minM2 ?? bounds.minM2,
        idealM2: room.idealM2 ?? bounds.idealM2,
        maxM2: room.maxM2 ?? bounds.maxM2,
        minSideM: room.minSideM ?? bounds.minSideM,
      });
      seen.add(room.type);
    }
    if (!seen.has('living')) {
      const bounds = this.roomBoundsFor(template, 'living');
      expandedRooms.unshift({ type: 'living', count: 1, ...bounds });
    }
    if (!seen.has('kitchen')) {
      const bounds = this.roomBoundsFor(template, 'kitchen');
      expandedRooms.push({ type: 'kitchen', count: 1, ...bounds });
    }

    return PrefsSnapshotSchema.parse({
      floors: input.floors,
      rooms: expandedRooms,
      kitchen: KitchenSpecSchema.parse(kitchen),
      bathConnectivity: BathConnectivitySchema.parse(bathConnectivity),
      mandatory: MandatoryRequirementsSchema.parse(mandatory),
      maxCoverage: input.maxCoverage ?? null,
      template,
    });
  }

  toGenerationRequest(
    prefs: PrefsSnapshot,
    plot: PlotSnapshot,
    overrides: GenerationOverrides = {},
  ): GenerationRequest {
    return {
      plot: { widthM: plot.widthM, depthM: plot.depthM },
      openSides: plot.openSides,
      wallThicknessM: prefs.template.wallThicknessM,
      circulationRatio: prefs.template.circulationRatio,
      doorWidthM: prefs.template.doorWidthM,
      staircase: prefs.template.staircase,
      floors: prefs.floors,
      rooms: prefs.rooms.map((room) => ({
        type: room.type,
        count: room.count,
        minM2: room.minM2,
        idealM2: room.idealM2,
        maxM2: room.maxM2,
      })),
      kitchen: prefs.kitchen,
      bathConnectivity: prefs.bathConnectivity,
      mandatory: {
        attachedBathrooms: prefs.mandatory.attachedBathrooms,
        indoorParking: {
          required: prefs.mandatory.indoorParking.required,
          cars: prefs.mandatory.indoorParking.cars,
        },
      },
      maxCoverage: prefs.maxCoverage,
      seed: overrides.seed,
      parent: overrides.parent,
      changeRequest: overrides.changeRequest,
    };
  }

  private roomBoundsFor(
    template: TemplateSnapshot,
    type: string,
  ): { minM2: number; idealM2: number; maxM2: number; minSideM: number } {
    return template.roomDefaults[type] ?? GENERIC_ROOM_BOUNDS;
  }
}
