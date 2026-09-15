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
  minSideM: z.number().positive().default(2.4),
});

export type ProfileRoomSpec = z.infer<typeof ProfileRoomSpecSchema>;

export const ChangeRequestSchema = z
  .object({
    overrideRooms: z
      .array(
        z.object({
          type: z
            .string()
            .regex(/^[a-z0-9_]+$/)
            .min(1),
          minM2: z.number().positive().optional(),
          idealM2: z.number().positive().optional(),
          maxM2: z.number().positive().optional(),
        }),
      )
      .optional(),
    addRooms: z.array(ProfileRoomSpecSchema).optional(),
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
