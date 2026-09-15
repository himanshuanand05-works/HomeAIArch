import { ConstraintViolation } from '../../../../common/errors/domain-errors';
import { GenerationRequest } from '../generation-request';
import { areaOf, Connection, contactLength, rectsOverlap } from '../model';
import { LevelRooms, Plan, PlacedRoom } from './space-partitioner';

export interface CheckOutcome {
  violations: ConstraintViolation[];
}

function buildAdjacency(connections: Connection[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  const link = (a: string, b: string): void => {
    const list = adjacency.get(a) ?? [];
    list.push(b);
    adjacency.set(a, list);
  };
  for (const connection of connections) {
    link(connection.from, connection.to);
    link(connection.to, connection.from);
  }
  return adjacency;
}

function reachable(start: string, adjacency: Map<string, string[]>): Set<string> {
  const visited = new Set<string>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    const neighbors = adjacency.get(current) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return visited;
}

function bedKey(room: { type: string; bedIndex?: number }): string {
  return room.bedIndex === undefined ? '' : `${room.type}${room.bedIndex}`;
}

function collectViolations(
  violations: ConstraintViolation[],
  room: PlacedRoom,
  constraint: string,
  expected: string,
  actual: string,
  hint?: string,
): void {
  violations.push({ constraint, room: room.id, expected, actual, hint });
}

function placeholderRoom(id: string, type: string, label: string, level: number): PlacedRoom {
  return {
    x: 0,
    y: 0,
    width: 0,
    depth: 0,
    id,
    type,
    label,
    level,
    planIndex: -1,
    areaTargetMm2: 0,
    minSideMm: 0,
  };
}

export function checkLayout(
  req: GenerationRequest,
  plan: Plan,
  levels: LevelRooms,
  stairRooms: PlacedRoom[],
  connections: Connection[],
): CheckOutcome {
  const violations: ConstraintViolation[] = [];

  for (let floorIndex = 0; floorIndex < levels.length; floorIndex += 1) {
    const floorPlan = plan.floors[floorIndex];
    const placed = levels[floorIndex];
    const perimeter = floorPlan.partitionRect;

    for (const room of placed) {
      const bounds = floorPlan.rooms[room.planIndex];
      if (room.x < perimeter.x - 1 || room.y < perimeter.y - 1) {
        collectViolations(
          violations,
          room,
          'IN_BOUNDS',
          `x>=${perimeter.x}, y>=${perimeter.y}`,
          `x=${room.x}, y=${room.y}`,
        );
      }
      if (
        room.x + room.width > perimeter.x + perimeter.width + 1 ||
        room.y + room.depth > perimeter.y + perimeter.depth + 1
      ) {
        collectViolations(
          violations,
          room,
          'IN_BOUNDS',
          `within ${perimeter.width}x${perimeter.depth}mm box`,
          `${room.width}x${room.depth}mm`,
        );
      }

      const actualArea = areaOf(room);
      if (bounds && actualArea < bounds.minMm2 - 1) {
        collectViolations(
          violations,
          room,
          'MIN_AREA',
          `>= ${bounds.minMm2}mm2`,
          `${actualArea}mm2`,
          'Reduce the number or size of rooms, or use a larger plot',
        );
      }
    }

    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        if (rectsOverlap(placed[i], placed[j])) {
          collectViolations(
            violations,
            placed[i],
            'NO_OVERLAP',
            `disjoint from ${placed[j].id}`,
            'overlap detected',
          );
        }
      }
    }

    const rooms = [...placed];
    for (let i = 0; i < rooms.length; i += 1) {
      const current = rooms[i];
      const bounds = floorPlan.rooms[current.planIndex];
      if (!bounds || !bounds.attachedBedType) {
        continue;
      }
      const host = rooms.find((candidate) => bedKey(candidate) === bounds.attachedBedType);
      if (host && contactLength(current, host) < req.doorWidthMm) {
        collectViolations(
          violations,
          current,
          'ENSUITE_ADJACENCY',
          `attached bathroom adjacent to ${host.id}`,
          'not sharing a full doorway edge',
          'Try a different seed or move the ensuite requirement',
        );
      }
    }
  }

  const levelsWithStair = stairRooms.length;
  if (req.floors > 1 && levelsWithStair !== req.floors) {
    collectViolations(
      violations,
      placeholderRoom('stair', 'stair', 'Staircase', 0),
      'STAIR_PER_FLOOR',
      `stair room on ${req.floors} floors`,
      `${levelsWithStair} floors have stairs`,
    );
  }

  const parkingCount = levels[0]?.filter((room) => room.type === 'parking').length ?? 0;
  const requiredCars = req.mandatory.indoorParking.required ? req.mandatory.indoorParking.cars : 0;
  if (parkingCount < requiredCars) {
    collectViolations(
      violations,
      placeholderRoom('parking', 'parking', 'Parking', 0),
      'INDOOR_PARKING',
      `${requiredCars} parking bays`,
      `${parkingCount} bays placed`,
    );
  }

  if (req.maxCoverage !== null) {
    const plotArea = req.plot.widthMm * req.plot.depthMm;
    const footprintArea = plan.footprint.width * plan.footprint.depth;
    const coverage = plotArea > 0 ? footprintArea / plotArea : 0;
    if (coverage > req.maxCoverage + 1e-6) {
      collectViolations(
        violations,
        placeholderRoom('footprint', 'footprint', 'Footprint', 0),
        'MAX_COVERAGE',
        `<= ${req.maxCoverage}`,
        `${coverage.toFixed(3)}`,
      );
    }
  }

  const start = connections.find((connection) => connection.from === 'entrance')?.to;
  if (start) {
    const reached = reachable(start, buildAdjacency(connections));
    const allRooms = [...levels.flat(), ...stairRooms];
    const unreached = allRooms.filter((room) => !reached.has(room.id));
    if (unreached.length > 0) {
      collectViolations(
        violations,
        unreached[0],
        'CONNECTED',
        'every room reachable from entrance',
        `${unreached[0].id} unreachable, ${unreached.length} room(s) isolated`,
      );
    }
  }

  return { violations };
}
