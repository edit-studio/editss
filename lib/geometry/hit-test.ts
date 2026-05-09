import type { Point, Annotation } from "../types";
import { HIT_PADDING } from "../constants";

// ─── Primitive Tests ────────────────────────────────────────

export function pointInRect(p: Point, x: number, y: number, w: number, h: number) {
  return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
}

export function pointInEllipse(
  p: Point,
  cx: number,
  cy: number,
  rx: number,
  ry: number
) {
  if (rx <= 0 || ry <= 0) return false;
  const nx = (p.x - cx) / rx;
  const ny = (p.y - cy) / ry;
  return nx * nx + ny * ny <= 1;
}

export function pointInTriangle(p: Point, a: Point, b: Point, c: Point): boolean {
  const d1 = (p.x - b.x) * (a.y - b.y) - (a.x - b.x) * (p.y - b.y);
  const d2 = (p.x - c.x) * (b.y - c.y) - (b.x - c.x) * (p.y - c.y);
  const d3 = (p.x - a.x) * (c.y - a.y) - (c.x - a.x) * (p.y - a.y);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

export function distPointToSegment(p: Point, a: Point, b: Point): number {
  const ax = b.x - a.x;
  const ay = b.y - a.y;
  const len2 = ax * ax + ay * ay;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * ax + (p.y - a.y) * ay) / len2;
  t = Math.max(0, Math.min(1, t));
  const qx = a.x + t * ax;
  const qy = a.y + t * ay;
  return Math.hypot(p.x - qx, p.y - qy);
}

// ─── Composite Hit Testing ──────────────────────────────────

function hitOne(o: Annotation, p: Point): boolean {
  if (o.type === "pen" || o.type === "highlight") {
    const tol = o.strokeWidth / 2 + HIT_PADDING;
    for (let j = 0; j < o.points.length - 1; j++) {
      if (distPointToSegment(p, o.points[j], o.points[j + 1]) <= tol) {
        return true;
      }
    }
    return false;
  }
  if (o.type === "arrow") {
    const tol = o.strokeWidth / 2 + HIT_PADDING;
    return distPointToSegment(p, o.start, o.end) <= tol;
  }
  if (
    o.type === "rect" ||
    o.type === "blur" ||
    o.type === "bubble" ||
    o.type === "text"
  ) {
    return pointInRect(p, o.x, o.y, o.width, o.height);
  }
  if (o.type === "ellipse") {
    return pointInEllipse(
      p,
      o.x + o.width / 2,
      o.y + o.height / 2,
      o.width / 2,
      o.height / 2
    );
  }
  if (o.type === "triangle") {
    const a = { x: o.x + o.width / 2, y: o.y };
    const b = { x: o.x, y: o.y + o.height };
    const c = { x: o.x + o.width, y: o.y + o.height };
    return pointInTriangle(p, a, b, c);
  }
  if (o.type === "counter") {
    const dx = p.x - o.x;
    const dy = p.y - o.y;
    return Math.hypot(dx, dy) <= o.size / 2 + HIT_PADDING / 2;
  }
  if (o.type === "spotlight") {
    if (o.shape === "ellipse") {
      return pointInEllipse(
        p,
        o.x + o.width / 2,
        o.y + o.height / 2,
        o.width / 2,
        o.height / 2
      );
    }
    return pointInRect(p, o.x, o.y, o.width, o.height);
  }
  return false;
}

/** Find the topmost object at a given point */
export function hitTest(objects: Annotation[], p: Point): string | null {
  for (let i = objects.length - 1; i >= 0; i--) {
    if (hitOne(objects[i], p)) return objects[i].id;
  }
  return null;
}

/** Find the topmost object of a specific type at a given point */
export function hitOfType(
  objects: Annotation[],
  p: Point,
  type: Annotation["type"]
): string | null {
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    if (o.type !== type) continue;
    if (hitOne(o, p)) return o.id;
  }
  return null;
}
