import { GenerationRequest } from '../generation-request';
import { Connection, Floor, Layout, LayoutMetrics, Rect, Room, RoomProps } from '../model';
import { LevelRooms, Plan, PlacedRoom } from './space-partitioner';
import { ScoreBreakdown, overallScore } from './scorer';

function buildProps(plan: Plan, level: number, planIndex: number): RoomProps | undefined {
  const spec = plan.floors[level]?.rooms[planIndex];
  if (!spec) {
    return undefined;
  }
  const props: RoomProps = {};
  if (spec.counterMinMm !== undefined) {
    props.counterMinMm = spec.counterMinMm;
  }
  if (spec.parkingCars !== undefined) {
    props.parkingCars = spec.parkingCars;
  }
  return Object.keys(props).length > 0 ? props : undefined;
}

function externalRectFor(room: PlacedRoom, plan: Plan, req: GenerationRequest): Rect {
  const wall = req.wallThicknessMm;
  const halfWall = Math.round(wall / 2);
  const usable = plan.usable;
  return {
    x: room.x === usable.x ? room.x - wall : room.x - halfWall,
    y: room.y === usable.y ? room.y - wall : room.y - halfWall,
    width:
      room.x + room.width === usable.x + usable.width ? room.width + wall : room.width + halfWall,
    depth:
      room.y + room.depth === usable.y + usable.depth ? room.depth + wall : room.depth + halfWall,
  };
}

function placeRooms(
  req: GenerationRequest,
  plan: Plan,
  levels: LevelRooms,
  stairRooms: PlacedRoom[],
): Floor[] {
  return plan.floors.map((floorPlan, floorIndex) => {
    const placed = [
      ...levels[floorIndex],
      ...stairRooms.filter((room) => room.level === floorIndex),
    ];
    const rooms: Room[] = placed
      .sort((a, b) => a.planIndex - b.planIndex)
      .map((room) => {
        const internalGeometry: Rect = {
          x: room.x,
          y: room.y,
          width: room.width,
          depth: room.depth,
        };
        return {
          roomId: room.id,
          type: room.type,
          label: room.label,
          x: room.x,
          y: room.y,
          width: room.width,
          depth: room.depth,
          externalGeometry: externalRectFor(room, plan, req),
          internalGeometry,
          level: room.level,
          areaMm2: room.width * room.depth,
          props: buildProps(plan, floorIndex, room.planIndex),
        };
      });
    return {
      floorNumber: floorPlan.floorNumber,
      name: floorPlan.name,
      rooms,
    };
  });
}

export function serializeLayout(
  req: GenerationRequest,
  plan: Plan,
  levels: LevelRooms,
  stairRooms: PlacedRoom[],
  connections: Connection[],
  breakdown: ScoreBreakdown,
): Layout {
  const floors = placeRooms(req, plan, levels, stairRooms);
  const plotArea = req.plot.widthMm * req.plot.depthMm;
  const footprintArea = plan.footprint.width * plan.footprint.depth;
  const roomAreaMm2 = floors
    .flatMap((floor) => floor.rooms)
    .reduce((acc, room) => acc + room.areaMm2, 0);
  const builtUpAreaMm2 = footprintArea * req.floors;
  const circulationMm2 = req.floors * plan.usable.width * plan.usable.depth - roomAreaMm2;

  const metrics: LayoutMetrics = {
    builtUpAreaMm2,
    roomAreaMm2,
    plotCoverage: Math.round((footprintArea / plotArea) * 1000) / 1000,
    circulationMm2,
    score: overallScore(breakdown),
    scoreBreakdown: breakdown,
  };

  return {
    schemaVersion: 1,
    unit: 'mm',
    resolutionMm: 1,
    wallThicknessMm: req.wallThicknessMm,
    plot: {
      widthMm: req.plot.widthMm,
      depthMm: req.plot.depthMm,
      openSides: req.openSides,
    },
    floors,
    connections,
    metrics,
  };
}
