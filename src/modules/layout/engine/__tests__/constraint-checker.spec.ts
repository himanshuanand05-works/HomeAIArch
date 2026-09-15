import { GenerationRequest } from '../generation-request';
import { buildPlan, partitionAll, stairRoomsFor } from '../algorithmic/space-partitioner';
import { buildConnections } from '../algorithmic/connectivity-plug';
import { checkLayout } from '../algorithmic/constraint-checker';
import { UnsolvableLayoutError } from '../../../../common/errors/domain-errors';
import { mulberry32, hashSeed } from '../../../../common/util/rng';
import { sampleRequest } from './fixtures';

function outcomeOf(request: GenerationRequest, seed: number) {
  const rng = mulberry32(hashSeed(seed));
  const plan = buildPlan(request);
  const levels = partitionAll(plan, rng);
  const stairRooms = stairRoomsFor(plan);
  const connections = buildConnections(request, plan, levels, stairRooms);
  return checkLayout(request, plan, levels, stairRooms, connections);
}

describe('constraint-checker', () => {
  it('reports no violations for a valid layout', () => {
    const outcome = outcomeOf(sampleRequest(), 42);
    expect(outcome.violations).toEqual([]);
  });

  it('throws UnsolvableLayoutError when the plot cannot hold rooms', () => {
    expect(() => outcomeOf(sampleRequest({ plot: { widthM: 3, depthM: 3 } }), 1)).toThrow(
      UnsolvableLayoutError,
    );
  });

  it('reports IN_BOUNDS violations for rooms outside the footprint', () => {
    const request = sampleRequest({ floors: 1 });
    const plan = buildPlan(request);
    const outOfBounds = {
      x: -5,
      y: -5,
      width: 2,
      depth: 2,
      id: 'living_f0_0',
      type: 'living',
      label: 'Living Room',
      level: 0,
      planIndex: 0,
      areaTargetM2: 4,
      minSideM: 2,
    };
    const outcome = checkLayout(request, plan, [[outOfBounds]], [], []);
    expect(outcome.violations.some((v) => v.constraint === 'IN_BOUNDS')).toBe(true);
  });

  it('reports STAIR_PER_FLOOR when stairs are missing', () => {
    const request = sampleRequest({ floors: 2 });
    const plan = buildPlan(request);
    const levels = plan.floors.map(() => []);
    const outcome = checkLayout(request, plan, levels, [], []);
    expect(outcome.violations.some((v) => v.constraint === 'STAIR_PER_FLOOR')).toBe(true);
  });

  it('reports INDOOR_PARKING when a required bay is missing', () => {
    const request = sampleRequest({
      mandatory: { attachedBathrooms: true, indoorParking: { required: true, cars: 2 } },
    });
    const plan = buildPlan(request);
    const levels = [[], []];
    const outcome = checkLayout(request, plan, levels, [], []);
    expect(outcome.violations.some((v) => v.constraint === 'INDOOR_PARKING')).toBe(true);
  });
});
