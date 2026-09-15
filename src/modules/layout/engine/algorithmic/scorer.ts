import { GenerationRequest } from '../generation-request';
import { contactLength, areaOf } from '../model';
import { LevelRooms, Plan, PlacedRoom } from './space-partitioner';

export interface ScoreBreakdown {
  balance: number;
  adjacency: number;
  orientation: number;
  stability: number;
  [key: string]: number;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function aspectOf(room: PlacedRoom): number {
  const ratio = room.width / room.depth;
  return ratio < 1 ? 1 / ratio : ratio;
}

function touchSides(plan: Plan): { x: number; y: number; width: number; height: number } {
  return {
    x: plan.footprint.x,
    y: plan.footprint.y,
    width: plan.footprint.width,
    height: plan.footprint.depth,
  };
}

function touchesOpenSide(plan: Plan, room: PlacedRoom): boolean {
  const frame = touchSides(plan);
  const onBottom = Math.abs(room.y + room.depth - (frame.y + frame.height)) < 1;
  const onLeft = Math.abs(room.x - frame.x) < 1;
  const onRight = Math.abs(room.x + room.width - (frame.x + frame.width)) < 1;
  const onTop = Math.abs(room.y - frame.y) < 1;
  return onBottom || onLeft || onRight || onTop;
}

function areAdjacent(a: PlacedRoom, b: PlacedRoom, doorWidth: number): boolean {
  return contactLength(a, b) >= doorWidth;
}

function balanceScore(levels: LevelRooms, kitchen: GenerationRequest['kitchen']): number {
  let penalty = 0;
  let count = 0;
  for (const room of levels.flat()) {
    const dev = Math.min(2, aspectOf(room) - 1);
    penalty += dev;
    count += 1;
    if (room.type === 'kitchen') {
      if (Math.max(room.width, room.depth) < kitchen.counterMinMm) {
        penalty += 0.3;
      }
    }
  }
  if (count === 0) {
    return 100;
  }
  const averagePenalty = penalty / count;
  return clampScore(100 - averagePenalty * 80);
}

function adjacencyScore(plan: Plan, levels: LevelRooms, doorWidth: number): number {
  let score = 100;
  const ground = levels[0] ?? [];
  const kitchen = ground.find((room) => room.type === 'kitchen');
  const dining = ground.find((room) => room.type === 'dining');
  if (kitchen && dining && !areAdjacent(kitchen, dining, doorWidth)) {
    score -= 10;
  }

  for (let floorIndex = 0; floorIndex < levels.length; floorIndex += 1) {
    const specRooms = plan.floors[floorIndex].rooms;
    const placed = levels[floorIndex];
    for (let idx = 0; idx < specRooms.length; idx += 1) {
      const spec = specRooms[idx];
      if (!spec.attachedBedType) {
        continue;
      }
      const bath = placed[idx];
      const host = placed.find(
        (candidate) =>
          candidate.bedIndex !== undefined &&
          `${candidate.type}${candidate.bedIndex}` === spec.attachedBedType,
      );
      if (host && !areAdjacent(bath, host, doorWidth)) {
        score -= 8;
      }
    }
  }
  return clampScore(score);
}

function orientationScore(plan: Plan, levels: LevelRooms): number {
  const rooms = levels.flat();
  if (rooms.length === 0) {
    return 100;
  }
  const touched = rooms.filter((room) => touchesOpenSide(plan, room)).length;
  return (touched / rooms.length) * 100;
}

function stabilityScore(req: GenerationRequest, levels: LevelRooms): number {
  if (!req.parent) {
    return 100;
  }
  const parentByLevel = new Map<number, Map<string, number>>();
  for (const floor of req.parent.floors) {
    const areas = new Map<string, number>();
    for (const room of floor.rooms) {
      areas.set(room.type, (areas.get(room.type) ?? 0) + areaOf(room.internalGeometry));
    }
    parentByLevel.set(floor.floorNumber, areas);
  }

  let overlap = 0;
  let total = 0;
  for (const floor of levels) {
    const parentAreas = parentByLevel.get(floor[0]?.level ?? 0) ?? new Map<string, number>();
    const childAreas = new Map<string, number>();
    for (const room of floor) {
      childAreas.set(room.type, (childAreas.get(room.type) ?? 0) + areaOf(room));
    }
    for (const [type, childArea] of childAreas) {
      const parentArea = parentAreas.get(type) ?? 0;
      overlap += Math.min(parentArea, childArea);
      total += Math.max(parentArea, childArea);
    }
  }
  if (total === 0) {
    return 100;
  }
  return (overlap / total) * 100;
}

export function scoreLayout(
  req: GenerationRequest,
  plan: Plan,
  levels: LevelRooms,
): ScoreBreakdown {
  return {
    balance: balanceScore(levels, req.kitchen),
    adjacency: adjacencyScore(plan, levels, req.doorWidthMm),
    orientation: orientationScore(plan, levels),
    stability: stabilityScore(req, levels),
  };
}

export function overallScore(breakdown: ScoreBreakdown): number {
  const weights = {
    balance: 0.3,
    adjacency: 0.3,
    orientation: 0.2,
    stability: 0.2,
  };
  return Math.round(
    breakdown.balance * weights.balance +
      breakdown.adjacency * weights.adjacency +
      breakdown.orientation * weights.orientation +
      breakdown.stability * weights.stability,
  );
}
