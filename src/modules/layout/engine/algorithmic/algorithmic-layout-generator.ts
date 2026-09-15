import { UnsolvableLayoutError } from '../../../../common/errors/domain-errors';
import { hashSeed, mulberry32 } from '../../../../common/util/rng';
import { GenerationRequest } from '../generation-request';
import { ILayoutGenerator, GenerationResult } from '../layout-generator.port';
import { Layout } from '../model';
import { buildPlan, partitionAll, stairRoomsFor } from './space-partitioner';
import { buildConnections } from './connectivity-plug';
import { checkLayout } from './constraint-checker';
import { scoreLayout, overallScore } from './scorer';
import { serializeLayout } from './layout-serializer';

export interface GeneratorOptions {
  maxRetries: number;
  timeoutMs: number;
}

export function applyChangeRequest(request: GenerationRequest): GenerationRequest {
  const change = request.changeRequest;
  if (!change) {
    return request;
  }

  let rooms = request.rooms;
  if (change.removeTypes && change.removeTypes.length > 0) {
    const removed = new Set(change.removeTypes);
    rooms = rooms.filter((room) => !removed.has(room.type));
  }

  if (change.overrideRooms && change.overrideRooms.length > 0) {
    rooms = rooms.map((room) => {
      const override = change.overrideRooms?.find((candidate) => candidate.type === room.type);
      if (!override) {
        return room;
      }
      return {
        ...room,
        minM2: override.minM2 ?? room.minM2,
        idealM2: override.idealM2 ?? room.idealM2,
        maxM2: override.maxM2 ?? room.maxM2,
      };
    });
  }

  if (change.addRooms && change.addRooms.length > 0) {
    rooms = [...rooms, ...change.addRooms];
  }

  return {
    ...request,
    rooms,
    maxCoverage: change.maxCoverage !== undefined ? change.maxCoverage : request.maxCoverage,
    changeRequest: undefined,
  };
}

export class AlgorithmicLayoutGenerator implements ILayoutGenerator {
  constructor(private readonly options: GeneratorOptions) {}

  generate(request: GenerationRequest): GenerationResult {
    const effective = applyChangeRequest(request);
    const seedList = this.seedList(effective);
    const startedAt = Date.now();

    let best: { layout: Layout; score: number } | null = null;
    let firstFailure: UnsolvableLayoutError | undefined;

    for (const seed of seedList) {
      if (Date.now() - startedAt > this.options.timeoutMs) {
        break;
      }
      const rng = mulberry32(hashSeed(seed));
      try {
        const plan = buildPlan(effective);
        const levels = partitionAll(plan, rng);
        const stairRooms = stairRoomsFor(plan);
        const connections = buildConnections(effective, plan, levels, stairRooms);
        const outcome = checkLayout(effective, plan, levels, stairRooms, connections);
        if (outcome.violations.length > 0) {
          firstFailure ??= new UnsolvableLayoutError(
            'No valid layout satisfies the given plot and preferences',
            outcome.violations,
          );
          continue;
        }
        const breakdown = scoreLayout(effective, plan, levels);
        const layout = serializeLayout(effective, plan, levels, stairRooms, connections, breakdown);
        const score = overallScore(breakdown);
        if (best === null || score > best.score) {
          best = { layout, score };
        }
      } catch (error) {
        if (error instanceof UnsolvableLayoutError) {
          firstFailure ??= error;
        } else {
          throw error;
        }
      }
    }

    if (best === null) {
      throw (
        firstFailure ??
        new UnsolvableLayoutError('Layout could not be generated', [
          {
            constraint: 'UNKNOWN',
            hint: 'No seed produced a valid layout within the engine budget',
          },
        ])
      );
    }
    return { layout: best.layout };
  }

  private seedList(request: GenerationRequest): number[] {
    if (request.seed !== undefined) {
      return [request.seed];
    }
    return Array.from({ length: this.options.maxRetries }, (_, index) => index + 1);
  }
}
