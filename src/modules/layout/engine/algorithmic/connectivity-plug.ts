import { GenerationRequest } from '../generation-request';
import { Connection, contactLength, Rect } from '../model';
import { LevelRooms, Plan, PlacedRoom } from './space-partitioner';

function appendConnection(
  target: Connection[],
  from: string,
  to: string,
  kind: Connection['kind'],
  widthMm: number,
  counter: { value: number },
): void {
  target.push({ id: `c${counter.value}`, from, to, kind, widthMm });
  counter.value += 1;
}

function centerOf(rect: Rect): { x: number; y: number } {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.depth / 2 };
}

function centerDistance(a: Rect, b: Rect): number {
  const ca = centerOf(a);
  const cb = centerOf(b);
  return Math.hypot(ca.x - cb.x, ca.y - cb.y);
}

function findEntranceRoom(
  ground: PlacedRoom[],
  stairRoom: PlacedRoom | undefined,
  plan: Plan,
): string | null {
  const bottomY = plan.footprint.y + plan.footprint.depth;
  const candidates = stairRoom ? [stairRoom, ...ground] : ground;
  if (candidates.length === 0) {
    return null;
  }
  const touching = candidates
    .filter((room) => Math.abs(room.y + room.depth - bottomY) < 1)
    .sort((a, b) => b.width - a.width);
  if (touching.length > 0) {
    return touching[0].id;
  }
  let deepest = candidates[0];
  for (const candidate of candidates) {
    if (candidate.y + candidate.depth > deepest.y + deepest.depth) {
      deepest = candidate;
    }
  }
  return deepest.id;
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

function ensureConnected(
  rooms: PlacedRoom[],
  initial: Connection[],
  doorWidthMm: number,
  counter: { value: number },
): Connection[] {
  const result = [...initial];
  const start = initial.find((connection) => connection.from === 'entrance')?.to;
  if (!start) {
    return result;
  }
  let guard = 0;
  const maxPasses = rooms.length * 2;
  while (guard < maxPasses) {
    const reached = reachable(start, buildAdjacency(result));
    const unreached = rooms.filter((room) => !reached.has(room.id));
    if (unreached.length === 0) {
      break;
    }
    const room = unreached[0];
    const peers = rooms.filter(
      (candidate) =>
        candidate.id !== room.id && candidate.level === room.level && reached.has(candidate.id),
    );
    if (peers.length === 0) {
      break;
    }
    let nearest = peers[0];
    for (const peer of peers) {
      if (centerDistance(room, peer) < centerDistance(room, nearest)) {
        nearest = peer;
      }
    }
    appendConnection(result, room.id, nearest.id, 'passage', doorWidthMm, counter);
    guard += 1;
  }
  return result;
}

export function buildConnections(
  req: GenerationRequest,
  plan: Plan,
  levels: LevelRooms,
  stairRooms: PlacedRoom[],
): Connection[] {
  const counter = { value: 1 };
  const connections: Connection[] = [];
  const allRooms: PlacedRoom[] = [];

  for (let floorIndex = 0; floorIndex < levels.length; floorIndex += 1) {
    const floorRooms = levels[floorIndex];
    allRooms.push(...floorRooms);
    const stairRoom = stairRooms[floorIndex];
    if (stairRoom) {
      allRooms.push(stairRoom);
    }
    const candidates = stairRoom ? [...floorRooms, stairRoom] : floorRooms;
    for (let i = 0; i < candidates.length; i += 1) {
      for (let j = i + 1; j < candidates.length; j += 1) {
        const overlap = contactLength(candidates[i], candidates[j]);
        if (overlap >= req.doorWidthMm) {
          appendConnection(
            connections,
            candidates[i].id,
            candidates[j].id,
            'door',
            Math.min(req.doorWidthMm, overlap),
            counter,
          );
        }
      }
    }
  }

  for (let f = 0; f + 1 < levels.length; f += 1) {
    const lower = stairRooms[f];
    const upper = stairRooms[f + 1];
    if (lower && upper) {
      appendConnection(connections, lower.id, upper.id, 'stair', req.staircase.widthMm, counter);
    }
  }

  const entranceRoomId = findEntranceRoom(levels[0] ?? [], stairRooms[0], plan);
  if (entranceRoomId) {
    appendConnection(connections, 'entrance', entranceRoomId, 'door', req.doorWidthMm, counter);
  }

  return ensureConnected(allRooms, connections, req.doorWidthMm, counter);
}
