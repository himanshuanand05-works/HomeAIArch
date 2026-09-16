import { ConnectionKind, Floor, Layout, Rect, Room } from '../models/design.model';
import { edgeMidpoint, fitScale, rectToPx, sharedEdge } from './geometry';

export interface RoomRender {
  id: string;
  roomId: string;
  type: string;
  label: string;
  areaLabel: string;
  inner: Rect;
  outer: Rect;
  highlighted: boolean;
}

export interface DoorRender {
  id: string;
  kind: ConnectionKind;
  x: number;
  y: number;
}

export interface FloorPlanModel {
  widthPx: number;
  depthPx: number;
  plot: { x: number; y: number; width: number; depth: number };
  rooms: RoomRender[];
  doors: DoorRender[];
  floorNumber: number;
}

const VIEWPORT = { width: 720, depth: 540 };

export function renderFloorPlan(
  layout: Layout,
  floorNumber: number,
  highlightRoomIds: string[] = [],
): FloorPlanModel {
  const floor = findFloor(layout, floorNumber);
  const fit = fitScale(layout.plot.widthMm, layout.plot.depthMm, VIEWPORT.width, VIEWPORT.depth);
  const scale = fit.scale;

  const rooms = floor.rooms.map((room) => {
    const inner = rectToPx(room.internalGeometry, scale);
    const outer = rectToPx(room.externalGeometry, scale);
    return {
      id: room.roomId,
      roomId: room.roomId,
      type: room.type,
      label: formatRoomLabel(room),
      areaLabel: `${(room.areaMm2 / 1_000_000).toFixed(1)} m²`,
      inner,
      outer,
      highlighted: highlightRoomIds.includes(room.roomId),
    };
  });

  const roomById = new Map(floor.rooms.map((room) => [room.roomId, room]));
  const doors: DoorRender[] = [];
  for (const connection of layout.connections) {
    const from = roomById.get(connection.from);
    const to = roomById.get(connection.to);
    if (!from || !to) {
      continue;
    }
    const edge = sharedEdge(from.internalGeometry, to.internalGeometry);
    if (!edge) {
      continue;
    }
    const midpoint = edgeMidpoint(edge);
    doors.push({
      id: connection.id,
      kind: connection.kind,
      x: Math.round(midpoint.x * scale),
      y: Math.round(midpoint.y * scale),
    });
  }

  return {
    widthPx: fit.widthPx,
    depthPx: fit.depthPx,
    plot: { x: 0, y: 0, width: fit.widthPx, depth: fit.depthPx },
    rooms,
    doors,
    floorNumber,
  };
}

function findFloor(layout: Layout, floorNumber: number): Floor {
  return (
    layout.floors.find((floor) => floor.floorNumber === floorNumber) ??
    layout.floors[0] ?? {
      floorNumber,
      name: `Floor ${floorNumber}`,
      rooms: [],
    }
  );
}

function formatRoomLabel(room: Room): string {
  return room.label && room.label !== room.type ? room.label : room.type;
}

export function sortRoomsForRender(rooms: Room[]): Room[] {
  return [...rooms].sort((a, b) => areaDesc(a, b));
}

function areaDesc(a: Room, b: Room): number {
  return b.areaMm2 - a.areaMm2;
}
