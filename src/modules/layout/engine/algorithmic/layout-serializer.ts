import { GRID_METERS } from '../../../../common/util/units';
import { GenerationRequest } from '../generation-request';
import { Connection, Floor, Layout, LayoutMetrics, Room, RoomProps } from '../model';
import { LevelRooms, Plan, PlacedRoom } from './space-partitioner';
import { ScoreBreakdown, overallScore } from './scorer';

function roundArea(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildProps(plan: Plan, level: number, planIndex: number): RoomProps | undefined {
  const spec = plan.floors[level]?.rooms[planIndex];
  if (!spec) {
    return undefined;
  }
  const props: RoomProps = {};
  if (spec.counterMinM !== undefined) {
    props.counterMinM = spec.counterMinM;
  }
  if (spec.parkingCars !== undefined) {
    props.parkingCars = spec.parkingCars;
  }
  return Object.keys(props).length > 0 ? props : undefined;
}

function placeRooms(plan: Plan, levels: LevelRooms, stairRooms: PlacedRoom[]): Floor[] {
  return plan.floors.map((floorPlan, floorIndex) => {
    const placed = [
      ...levels[floorIndex],
      ...stairRooms.filter((room) => room.level === floorIndex),
    ];
    const rooms: Room[] = placed
      .sort((a, b) => a.planIndex - b.planIndex)
      .map((room) => ({
        roomId: room.id,
        type: room.type,
        label: room.label,
        x: room.x,
        y: room.y,
        width: room.width,
        depth: room.depth,
        level: room.level,
        areaM2: roundArea(room.width * room.depth),
        props: buildProps(plan, floorIndex, room.planIndex),
      }));
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
  const floors = placeRooms(plan, levels, stairRooms);
  const plotArea = req.plot.widthM * req.plot.depthM;
  const footprintArea = plan.footprint.width * plan.footprint.depth;
  const roomAreaM2 =
    Math.round(
      floors.flatMap((floor) => floor.rooms).reduce((acc, room) => acc + room.areaM2, 0) * 100,
    ) / 100;
  const builtUpAreaM2 = Math.round(footprintArea * req.floors * 100) / 100;
  const circulationM2 =
    Math.round((req.floors * plan.usable.width * plan.usable.depth - roomAreaM2) * 100) / 100;

  const score = overallScore(breakdown);
  const metrics: LayoutMetrics = {
    builtUpAreaM2,
    roomAreaM2,
    plotCoverage: Math.round((footprintArea / plotArea) * 1000) / 1000,
    circulationM2,
    score,
    scoreBreakdown: breakdown,
  };

  return {
    schemaVersion: 1,
    unit: 'meters',
    resolution: GRID_METERS,
    wallThicknessM: req.wallThicknessM,
    plot: {
      width: req.plot.widthM,
      depth: req.plot.depthM,
      openSides: req.openSides,
    },
    floors,
    connections,
    metrics,
  };
}
