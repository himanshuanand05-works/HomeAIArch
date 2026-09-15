import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { GenerationRequest } from '../layout/engine/generation-request';
import { squareMetresToSquareMillimetres } from '../../common/util/units';
import {
  BathConnectivitySchema,
  ChangeRequestSchema,
  KitchenSpecSchema,
  MandatoryRequirementsSchema,
  PlotSnapshotSchema,
  PrefsSnapshotSchema,
  ProfileRoomSpec,
  ProfileRoomSpecSchema,
  TemplateSnapshotSchema,
} from './schemas';
import type { TemplateSnapshot, PlotSnapshot, PrefsSnapshot } from './schemas';

export type { TemplateSnapshot, PlotSnapshot, PrefsSnapshot } from './schemas';

const GENERIC_ROOM_BOUNDS = { minM2: 6, idealM2: 9, maxM2: 15, minSideMm: 2000 };

export type KitchenSpec = z.infer<typeof KitchenSpecSchema>;
export type BathConnectivity = z.infer<typeof BathConnectivitySchema>;
export type MandatoryRequirements = z.infer<typeof MandatoryRequirementsSchema>;

export interface ProfileRoomInput {
  type: string;
  count?: number;
  minM2?: number;
  idealM2?: number;
  maxM2?: number;
  minSideMm?: number;
}

export interface PrefsInput {
  floors: number;
  rooms: ProfileRoomInput[];
  kitchen?: Partial<KitchenSpec>;
  bathConnectivity?: Partial<BathConnectivity>;
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
    kitchen: KitchenSpec;
    bathConnectivity: BathConnectivity;
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
            counterMinMm: input.kitchen.counterMinMm ?? template.kitchenDefaults.counterMinMm,
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
        minSideMm: room.minSideMm ?? bounds.minSideMm,
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
      plot: { widthMm: plot.widthMm, depthMm: plot.depthMm },
      openSides: plot.openSides,
      wallThicknessMm: prefs.template.wallThicknessMm,
      circulationRatio: prefs.template.circulationRatio,
      doorWidthMm: prefs.template.doorWidthMm,
      staircase: prefs.template.staircase,
      floors: prefs.floors,
      rooms: prefs.rooms.map((room) => ({
        type: room.type,
        count: room.count,
        minMm2: squareMetresToSquareMillimetres(room.minM2),
        idealMm2: squareMetresToSquareMillimetres(room.idealM2),
        maxMm2: squareMetresToSquareMillimetres(room.maxM2),
        minSideMm: room.minSideMm,
      })),
      kitchen: {
        minMm2: squareMetresToSquareMillimetres(prefs.kitchen.minM2),
        idealMm2: squareMetresToSquareMillimetres(prefs.kitchen.idealM2),
        maxMm2: squareMetresToSquareMillimetres(prefs.kitchen.maxM2),
        counterMinMm: prefs.kitchen.counterMinMm,
      },
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
  ): { minM2: number; idealM2: number; maxM2: number; minSideMm: number } {
    return template.roomDefaults[type] ?? GENERIC_ROOM_BOUNDS;
  }
}
