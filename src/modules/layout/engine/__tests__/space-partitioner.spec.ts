import { GenerationRequest } from '../generation-request';
import {
  buildPlan,
  partitionAll,
  stairRoomsFor,
  PlacedRoom,
} from '../algorithmic/space-partitioner';
import { mulberry32, hashSeed } from '../../../../common/util/rng';
import { rectsOverlap, areaOf } from '../model';
import { sampleRequest, sampleRequestSingleStorey } from './fixtures';

function run(
  request: GenerationRequest,
  seed: number,
): { levels: PlacedRoom[][]; stairRooms: PlacedRoom[]; plan: ReturnType<typeof buildPlan> } {
  const rng = mulberry32(hashSeed(seed));
  const plan = buildPlan(request);
  const levels = partitionAll(plan, rng);
  const stairRooms = stairRoomsFor(plan);
  return { levels, stairRooms, plan };
}

describe('space-partitioner', () => {
  it('places exactly one room per planned slot', () => {
    const request = sampleRequest();
    const { levels, plan } = run(request, 42);
    const expectedPerFloor = plan.floors.map((floor) => floor.rooms.length);
    expectedPerFloor.forEach((expected, floorIndex) => {
      expect(levels[floorIndex]).toHaveLength(expected);
    });
    const placed = levels.flat().length;
    expect(placed).toBe(expectedPerFloor.reduce((acc, count) => acc + count, 0));
    expect(placed).toBeGreaterThan(0);
  });

  it('keeps rooms inside the plot and free of overlaps', () => {
    const request = sampleRequest();
    const { levels, plan } = run(request, 42);
    const rooms = levels.flat();
    for (const room of rooms) {
      expect(room.x).toBeGreaterThanOrEqual(plan.footprint.x - 1e-6);
      expect(room.y).toBeGreaterThanOrEqual(plan.footprint.y - 1e-6);
      expect(room.x + room.width).toBeLessThanOrEqual(
        plan.footprint.x + plan.footprint.width + 1e-6,
      );
      expect(room.y + room.depth).toBeLessThanOrEqual(
        plan.footprint.y + plan.footprint.depth + 1e-6,
      );
    }
    for (let i = 0; i < rooms.length; i += 1) {
      for (let j = i + 1; j < rooms.length; j += 1) {
        if (rooms[i].level === rooms[j].level) {
          expect(rectsOverlap(rooms[i], rooms[j])).toBe(false);
        }
      }
    }
  });

  it('respects the reserved staircase strip on upper floors', () => {
    const request = sampleRequest();
    const { levels, plan, stairRooms } = run(request, 42);
    expect(plan.stair).not.toBeNull();
    expect(levels.length).toBe(request.floors);
    for (const level of levels) {
      for (const room of level) {
        expect(room.x).toBeGreaterThanOrEqual(plan.stair!.rect.x + plan.stair!.rect.width - 1e-6);
      }
    }
    expect(stairRooms.length).toBe(request.floors);
  });

  it('produces no stairs on a single storey house', () => {
    const request = sampleRequestSingleStorey();
    const { plan, stairRooms } = run(request, 7);
    expect(plan.stair).toBeNull();
    expect(stairRooms).toHaveLength(0);
  });

  it('meets minimum areas for common room types', () => {
    const request = sampleRequest({ floors: 1 });
    const { levels } = run(request, 3);
    const rooms = levels.flat();
    const bedroomArea = rooms
      .filter((room) => room.type === 'bed1' || room.type === 'bed2')
      .reduce((sum, room) => sum + areaOf(room), 0);
    const kitchenArea = rooms
      .filter((room) => room.type === 'kitchen')
      .reduce((sum, room) => sum + areaOf(room), 0);
    expect(bedroomArea).toBeGreaterThanOrEqual(13.4 + 10);
    expect(kitchenArea).toBeGreaterThanOrEqual(7);
  });
});
