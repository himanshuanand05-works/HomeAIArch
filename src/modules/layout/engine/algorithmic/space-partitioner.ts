import { UnsolvableLayoutError } from '../../../../common/errors/domain-errors';
import { GenerationRequest } from '../generation-request';
import { Rect } from '../model';
import { labelFor } from '../room-registry';

export interface BoundsLike {
  minMm2: number;
  idealMm2: number;
  maxMm2: number;
}

export interface PlannedRoom extends BoundsLike {
  type: string;
  label: string;
  minSideMm: number;
  bedIndex?: number;
  attachedBedType?: string;
  parkingCars?: number;
  counterMinMm?: number;
}

export interface FloorPlan {
  floorNumber: number;
  name: string;
  partitionRect: Rect;
  rooms: PlannedRoom[];
}

export interface StairReservation {
  rect: Rect;
  widthMm: number;
  depthMm: number;
}

export interface Plan {
  floors: FloorPlan[];
  footprint: Rect;
  usable: Rect;
  stair: StairReservation | null;
}

export interface PlacedRoom extends Rect {
  id: string;
  type: string;
  label: string;
  level: number;
  planIndex: number;
  areaTargetMm2: number;
  minSideMm: number;
  bedIndex?: number;
}

export type LevelRooms = PlacedRoom[][];

const SNAP_EPSILON = 1e-3;

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

function fitAreas(bounds: BoundsLike[], available: number): number[] | null {
  if (bounds.length === 0) {
    return [];
  }
  const totalMin = sum(bounds.map((b) => b.minMm2));
  const totalMax = sum(bounds.map((b) => b.maxMm2));
  if (totalMin > available + SNAP_EPSILON) {
    return null;
  }
  const initial = bounds.map((b) => Math.min(b.maxMm2, Math.max(b.minMm2, b.idealMm2)));
  if (sum(initial) <= available + SNAP_EPSILON) {
    return initial;
  }
  if (totalMax < available - SNAP_EPSILON) {
    return null;
  }
  const headroom = bounds.map((b) => Math.max(0, b.maxMm2 - b.minMm2));
  const headroomTotal = sum(headroom);
  const surplus = available - totalMin;
  return bounds.map((b, index) =>
    Math.min(b.maxMm2, b.minMm2 + (surplus * headroom[index]) / Math.max(1e-9, headroomTotal)),
  );
}

interface PartitionGroup {
  indices: number[];
  area: number;
}

function bedKeyOf(room: { type: string; bedIndex?: number }): string {
  return room.bedIndex === undefined ? room.type : `${room.type}${room.bedIndex}`;
}

function buildGroups(rooms: PlannedRoom[], areas: number[]): PartitionGroup[] {
  const hostByEnsuite = new Map<number, number>();
  const consumed = new Set<number>();
  for (let index = 0; index < rooms.length; index += 1) {
    const room = rooms[index];
    if (!room.attachedBedType) {
      continue;
    }
    const hostIndex = rooms.findIndex(
      (candidate, candidateIndex) =>
        candidateIndex < index && bedKeyOf(candidate) === room.attachedBedType,
    );
    if (hostIndex !== -1) {
      hostByEnsuite.set(index, hostIndex);
      consumed.add(hostIndex);
    }
  }

  const groups: PartitionGroup[] = [];
  for (let index = 0; index < rooms.length; index += 1) {
    if (consumed.has(index)) {
      continue;
    }
    if (hostByEnsuite.has(index)) {
      const hostIndex = hostByEnsuite.get(index) as number;
      groups.push({
        indices: [hostIndex, index],
        area: areas[hostIndex] + areas[index],
      });
      continue;
    }
    groups.push({ indices: [index], area: areas[index] });
  }
  return groups;
}

function partitionLeaf(
  rect: Rect,
  groups: PartitionGroup[],
  chooseTie: () => number,
): Rect[] | null {
  if (groups.length === 0) {
    return null;
  }
  if (groups.length === 1) {
    return [{ ...rect }];
  }

  const total = sum(groups.map((group) => group.area));
  const prefix: number[] = [];
  let acc = 0;
  for (const group of groups) {
    prefix.push(acc);
    acc += group.area;
  }

  const aspectPenalty = (ratio: number): number => (ratio < 1 ? 1 / ratio : ratio);

  const vertical = rect.width >= rect.depth;
  const span = vertical ? rect.width : rect.depth;

  const candidates: number[] = [];
  let bestScore = Number.POSITIVE_INFINITY;
  for (let k = 1; k < groups.length; k += 1) {
    const leftShare = prefix[k] / total;
    const split = Math.round(span * leftShare);
    if (split < 1 || span - split < 1) {
      continue;
    }
    const leftWidth = vertical ? split : rect.width;
    const leftDepth = vertical ? rect.depth : split;
    const rightWidth = vertical ? rect.width - split : rect.width;
    const rightDepth = vertical ? rect.depth : rect.depth - split;
    const score =
      aspectPenalty(leftWidth / leftDepth) * leftShare +
      aspectPenalty(rightWidth / rightDepth) * (1 - leftShare);
    if (Number.isNaN(score)) {
      continue;
    }
    const jitteredScore = score * (1 + (chooseTie() - 0.5) * 0.04);
    if (jitteredScore < bestScore - 1e-9) {
      bestScore = jitteredScore;
      candidates.length = 0;
      candidates.push(k);
    } else if (Math.abs(jitteredScore - bestScore) <= 1e-9) {
      candidates.push(k);
    }
  }
  if (candidates.length === 0) {
    return null;
  }

  const bestIndex = candidates[Math.floor(chooseTie() * candidates.length)];
  const split = Math.round((span * prefix[bestIndex]) / total);
  const leftRect: Rect = vertical
    ? { x: rect.x, y: rect.y, width: split, depth: rect.depth }
    : { x: rect.x, y: rect.y, width: rect.width, depth: split };
  const rightRect: Rect = vertical
    ? { x: rect.x + split, y: rect.y, width: rect.width - split, depth: rect.depth }
    : { x: rect.x, y: rect.y + split, width: rect.width, depth: rect.depth - split };

  const leftResult = partitionLeaf(leftRect, groups.slice(0, bestIndex), chooseTie);
  const rightResult = partitionLeaf(rightRect, groups.slice(bestIndex), chooseTie);
  if (leftResult === null || rightResult === null) {
    return null;
  }
  return [...leftResult, ...rightResult];
}

function expandGroup(rect: Rect, group: PartitionGroup, areas: number[]): Rect[] {
  if (group.indices.length === 1) {
    return [{ ...rect }];
  }
  const [hostIndex, ensuiteIndex] = group.indices;
  const hostArea = areas[hostIndex];
  const ensuiteArea = areas[ensuiteIndex];
  if (rect.depth < rect.width) {
    const hostDepth = Math.round(rect.depth * (hostArea / (hostArea + ensuiteArea)));
    return [
      { x: rect.x, y: rect.y, width: rect.width, depth: hostDepth },
      { x: rect.x, y: rect.y + hostDepth, width: rect.width, depth: rect.depth - hostDepth },
    ];
  }
  const hostWidth = Math.round(rect.width * (hostArea / (hostArea + ensuiteArea)));
  return [
    { x: rect.x, y: rect.y, width: hostWidth, depth: rect.depth },
    { x: rect.x + hostWidth, y: rect.y, width: rect.width - hostWidth, depth: rect.depth },
  ];
}

function autoLiving(): PlannedRoom {
  return {
    type: 'living',
    label: labelFor('living'),
    minMm2: 12_000_000,
    idealMm2: 18_000_000,
    maxMm2: 30_000_000,
    minSideMm: 3000,
  };
}

export function buildPlan(req: GenerationRequest): Plan {
  const plotWidth = req.plot.widthMm;
  const plotDepth = req.plot.depthMm;
  const wall = req.wallThicknessMm;

  const footprint: Rect =
    req.maxCoverage !== null && req.maxCoverage > 0 && req.maxCoverage < 1
      ? floorFootprint(plotWidth, plotDepth, req.maxCoverage)
      : { x: 0, y: 0, width: plotWidth, depth: plotDepth };

  const usable: Rect = {
    x: footprint.x + wall,
    y: footprint.y + wall,
    width: footprint.width - 2 * wall,
    depth: footprint.depth - 2 * wall,
  };
  if (usable.width <= 0 || usable.depth <= 0) {
    throw new UnsolvableLayoutError('Plot too small to host walls', [
      {
        constraint: 'PLOT_SIZE',
        expected: `usable width/depth > 0 with wall=${wall}mm`,
        actual: `${usable.width} x ${usable.depth} mm`,
        hint: 'Use a larger plot or a thinner wall template',
      },
    ]);
  }

  const stairs = req.floors > 1 ? req.staircase : null;
  const partitionRect: Rect = stairs
    ? {
        x: usable.x + stairs.widthMm,
        y: usable.y,
        width: usable.width - stairs.widthMm,
        depth: usable.depth,
      }
    : usable;

  const floors: FloorPlan[] = [];
  for (let level = 0; level < req.floors; level += 1) {
    const ground = level === 0;
    const rooms = ground ? buildGroundRooms(req) : buildUpperRooms(req, level);
    const name = ground ? 'Ground Floor' : `Floor ${level + 1}`;
    floors.push({
      floorNumber: level,
      name,
      partitionRect,
      rooms,
    });
  }

  const stair: StairReservation | null = stairs
    ? {
        rect: {
          x: usable.x,
          y: usable.y + usable.depth - Math.min(stairs.depthMm, usable.depth),
          width: stairs.widthMm,
          depth: Math.min(stairs.depthMm, usable.depth),
        },
        widthMm: stairs.widthMm,
        depthMm: stairs.depthMm,
      }
    : null;

  return { floors, footprint, usable, stair };
}

function buildGroundRooms(req: GenerationRequest): PlannedRoom[] {
  const rooms: PlannedRoom[] = [];

  if (req.mandatory.indoorParking.required && req.mandatory.indoorParking.cars > 0) {
    for (let i = 0; i < req.mandatory.indoorParking.cars; i += 1) {
      rooms.push({
        type: 'parking',
        label: `Parking ${i + 1}`,
        minMm2: 12_500_000,
        idealMm2: 16_000_000,
        maxMm2: 25_000_000,
        minSideMm: 2400,
        parkingCars: 1,
      });
    }
  }

  const hasLiving = req.rooms.some((r) => r.type === 'living');
  const hasDining = req.rooms.some((r) => r.type === 'dining');
  const hasKitchen = req.rooms.some((r) => r.type === 'kitchen');

  if (!hasLiving) {
    rooms.push(autoLiving());
  }
  if (hasDining) {
    rooms.push({
      type: 'dining',
      label: labelFor('dining'),
      minMm2: 9_000_000,
      idealMm2: 12_000_000,
      maxMm2: 18_000_000,
      minSideMm: 2400,
    });
  }
  if (hasKitchen) {
    rooms.push({
      type: 'kitchen',
      label: labelFor('kitchen'),
      ...boundsOf(req.kitchen),
      minSideMm: 2100,
      counterMinMm: req.kitchen.counterMinMm,
    });
  }

  for (const spec of req.rooms) {
    if (spec.type === 'living' || spec.type === 'dining' || spec.type === 'kitchen') {
      continue;
    }
    if (isBedroomType(spec.type)) {
      if (req.floors > 1) {
        continue;
      }
      pushBedrooms(rooms, spec);
    } else if (spec.type === 'stair') {
      continue;
    } else {
      rooms.push({ ...specToPlanned(spec) });
    }
  }

  const commonBaths = Math.max(0, req.bathConnectivity.commonBaths);
  for (let i = 0; i < commonBaths; i += 1) {
    rooms.push({
      type: 'bath',
      label: i === 0 ? 'Family Bathroom' : `Bathroom ${i + 1}`,
      minMm2: 2_400_000,
      idealMm2: 3_600_000,
      maxMm2: 6_000_000,
      minSideMm: 1500,
    });
  }

  pushWc(rooms, req, 0);

  return rooms;
}

function boundsOf(spec: { minMm2: number; idealMm2: number; maxMm2: number }): BoundsLike {
  return { minMm2: spec.minMm2, idealMm2: spec.idealMm2, maxMm2: spec.maxMm2 };
}

function isBedroomType(type: string): boolean {
  return (
    type === 'bed1' || type === 'bed2' || type === 'bed3' || type === 'bed4' || type === 'bedroom'
  );
}

function specToPlanned(spec: {
  type: string;
  count: number;
  minMm2: number;
  idealMm2: number;
  maxMm2: number;
  minSideMm: number;
}): PlannedRoom {
  return {
    type: spec.type,
    label: labelFor(spec.type),
    minMm2: spec.minMm2,
    idealMm2: spec.idealMm2,
    maxMm2: spec.maxMm2,
    minSideMm: spec.minSideMm,
  };
}

function pushBedrooms(
  target: PlannedRoom[],
  spec: { type: string; count: number; minMm2: number; idealMm2: number; maxMm2: number },
): void {
  const beds: PlannedRoom[] = [];
  for (let i = 0; i < spec.count; i += 1) {
    beds.push({
      type: spec.type,
      label: labelFor(spec.type),
      minMm2: spec.minMm2,
      idealMm2: spec.idealMm2,
      maxMm2: spec.maxMm2,
      minSideMm: 3000,
      bedIndex: beds.length,
    });
  }
  target.push(...beds);
}

function pushWc(target: PlannedRoom[], req: GenerationRequest, ordinal: number): void {
  for (let i = 0; i < req.bathConnectivity.wcPerFloor; i += 1) {
    target.push({
      type: 'wc',
      label: ordinal === 0 && i === 0 ? 'W.C.' : `W.C. ${i + 1}`,
      minMm2: 1_200_000,
      idealMm2: 1_800_000,
      maxMm2: 3_000_000,
      minSideMm: 1000,
    });
  }
}

function buildUpperRooms(req: GenerationRequest, level: number): PlannedRoom[] {
  const rooms: PlannedRoom[] = [];

  const bedSpecs: PlannedRoom[] = [];
  for (const spec of req.rooms) {
    if (isBedroomType(spec.type)) {
      pushBedrooms(bedSpecs, spec);
    }
  }

  const totalUpperBeds = bedSpecs.length;
  const floorsAbove = Math.max(1, req.floors - 1);
  const perFloor = Math.max(1, Math.ceil(totalUpperBeds / floorsAbove));

  const sliceStart = (level - 1) * perFloor;
  const sliceEnd = Math.min(sliceStart + perFloor, totalUpperBeds);
  for (let i = sliceStart; i < sliceEnd; i += 1) {
    const bed = bedSpecs[i];
    bed.bedIndex = i;
    rooms.push(bed);
    if (req.mandatory.attachedBathrooms) {
      rooms.push({
        type: 'bath',
        label: `${bed.label} - Ensuite`,
        minMm2: 2_400_000,
        idealMm2: 3_600_000,
        maxMm2: 5_000_000,
        minSideMm: 1500,
        attachedBedType: bed.type + (bed.bedIndex ?? 0),
      });
    }
  }

  pushWc(rooms, req, level);

  return rooms;
}

function floorFootprint(plotWidth: number, plotDepth: number, maxCoverage: number): Rect {
  const targetDepth = (maxCoverage * plotWidth * plotDepth) / plotWidth;
  const depth = Math.min(plotDepth, Math.max(2400, Math.round(targetDepth)));
  return {
    x: 0,
    y: plotDepth - depth,
    width: plotWidth,
    depth,
  };
}

export function partitionAll(plan: Plan, chooseTie: () => number): LevelRooms {
  const levels: LevelRooms = [];
  for (const floor of plan.floors) {
    const bounds = floor.rooms;
    const partitionArea = floor.partitionRect.width * floor.partitionRect.depth;
    const areas = fitAreas(bounds, partitionArea);
    if (areas === null) {
      throw new UnsolvableLayoutError(
        `Floor "floor-${floor.floorNumber}" cannot fit its minimum room areas`,
        bounds.map((room) => ({
          constraint: 'MIN_AREA',
          room: room.type,
          expected: `>= ${room.minMm2}mm2`,
          actual: areaText(room, floor.partitionRect),
          hint: 'Reduce room sizes, floors, or parking requirement',
        })),
      );
    }
    const fitSum = sum(areas);
    const container = fitSum > 0 ? shrinkToArea(floor.partitionRect, fitSum) : floor.partitionRect;
    const groups = buildGroups(floor.rooms, areas);
    const groupRects = partitionLeaf(container, groups, chooseTie);
    if (groupRects === null) {
      throw new UnsolvableLayoutError(
        `Floor "floor-${floor.floorNumber}" cannot partition its rooms`,
        bounds.map((room) => ({
          constraint: 'UNKNOWN',
          room: room.type,
          expected: 'a valid partition',
          actual: aspectRatioBalanced(room, container),
          hint: 'Use a more square plot, fewer rooms, or a larger plot',
        })),
      );
    }
    const placed: PlacedRoom[] = [];
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
      const group = groups[groupIndex];
      const memberRects = expandGroup(groupRects[groupIndex], group, areas);
      for (let memberIndex = 0; memberIndex < group.indices.length; memberIndex += 1) {
        const index = group.indices[memberIndex];
        const room = floor.rooms[index];
        placed.push({
          ...memberRects[memberIndex],
          id: `${room.type}_f${floor.floorNumber}_${index}`,
          type: room.type,
          label: room.label,
          level: floor.floorNumber,
          planIndex: index,
          areaTargetMm2: areas[index],
          minSideMm: room.minSideMm,
          bedIndex: room.bedIndex,
        });
      }
    }
    levels.push(placed);
  }
  return levels;
}

function aspectRatioBalanced(room: BoundsLike, rect: Rect): string {
  return `ideal ${room.idealMm2}mm2 in ${rect.width}x${rect.depth}mm cell`;
}

function areaText(room: BoundsLike, rect: Rect): string {
  return `ideal ${room.idealMm2}mm2 in ${rect.width}x${rect.depth}mm`;
}

function shrinkToArea(rect: Rect, area: number): Rect {
  const rectArea = rect.width * rect.depth;
  const scale = Math.sqrt(area / rectArea);
  const width = Math.max(1, Math.round(rect.width * scale));
  const depth = Math.max(1, Math.round(rect.depth * scale));
  return {
    x: rect.x + Math.round((rect.width - width) / 2),
    y: rect.y + Math.round((rect.depth - depth) / 2),
    width,
    depth,
  };
}

export function stairRoomsFor(plan: Plan): PlacedRoom[] {
  if (!plan.stair) {
    return [];
  }
  return plan.floors.map((floor) => ({
    ...plan.stair!.rect,
    id: `stair_f${floor.floorNumber}`,
    type: 'stair',
    label: 'Staircase',
    level: floor.floorNumber,
    planIndex: -1,
    areaTargetMm2: plan.stair!.rect.width * plan.stair!.rect.depth,
    minSideMm: plan.stair!.widthMm,
  }));
}
