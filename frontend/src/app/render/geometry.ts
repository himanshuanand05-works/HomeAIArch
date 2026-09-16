import { Rect } from '../models/design.model';

export interface ScaleResult {
  scale: number;
  widthPx: number;
  depthPx: number;
}

export function fitScale(
  widthMm: number,
  depthMm: number,
  maxWidthPx: number,
  maxDepthPx: number,
): ScaleResult {
  const scale = Math.min(maxWidthPx / widthMm, maxDepthPx / depthMm);
  return {
    scale,
    widthPx: Math.round(widthMm * scale),
    depthPx: Math.round(depthMm * scale),
  };
}

export function rectToPx(rect: Rect, scale: number): Rect {
  return {
    x: Math.round(rect.x * scale),
    y: Math.round(rect.y * scale),
    width: Math.round(rect.width * scale),
    depth: Math.round(rect.depth * scale),
  };
}

export interface Edge {
  axis: 'h' | 'v';
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

export function sharedEdge(a: Rect, b: Rect, toleranceMm = 100): Edge | null {
  const aRight = a.x + a.width;
  const bRight = b.x + b.width;
  const aBottom = a.y + a.depth;
  const bBottom = b.y + b.depth;

  const verticalContact =
    Math.abs(aRight - b.x) < toleranceMm || Math.abs(bRight - a.x) < toleranceMm;
  const horizontalContact =
    Math.abs(aBottom - b.y) < toleranceMm || Math.abs(bBottom - a.y) < toleranceMm;

  if (verticalContact) {
    const x = Math.abs(aRight - b.x) < toleranceMm ? aRight : bRight;
    const yMin = Math.max(a.y, b.y);
    const yMax = Math.min(aBottom, bBottom);
    if (yMax - yMin > 0) {
      return { axis: 'v', x1: x, x2: x, y1: yMin, y2: yMax };
    }
  }

  if (horizontalContact) {
    const y = Math.abs(aBottom - b.y) < toleranceMm ? aBottom : bBottom;
    const xMin = Math.max(a.x, b.x);
    const xMax = Math.min(aRight, bRight);
    if (xMax - xMin > 0) {
      return { axis: 'h', x1: xMin, x2: xMax, y1: y, y2: y };
    }
  }

  return null;
}

export function edgeMidpoint(edge: Edge): { x: number; y: number } {
  return {
    x: ((edge.x1 as number) + (edge.x2 as number)) / 2,
    y: ((edge.y1 as number) + (edge.y2 as number)) / 2,
  };
}
