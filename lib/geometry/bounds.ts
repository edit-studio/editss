import type { Point, Rect, Annotation } from "../types";

/** Calculate the bounding box of an annotation object */
export function annotationBounds(obj: Annotation) {
  if (obj.type === "pen" || obj.type === "highlight") {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of obj.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const pad = obj.strokeWidth;
    return {
      minX: minX - pad,
      minY: minY - pad,
      maxX: maxX + pad,
      maxY: maxY + pad,
    };
  }
  if (obj.type === "arrow") {
    const minX = Math.min(obj.start.x, obj.end.x);
    const minY = Math.min(obj.start.y, obj.end.y);
    const maxX = Math.max(obj.start.x, obj.end.x);
    const maxY = Math.max(obj.start.y, obj.end.y);
    const pad = Math.max(8, obj.strokeWidth * 4);
    return {
      minX: minX - pad,
      minY: minY - pad,
      maxX: maxX + pad,
      maxY: maxY + pad,
    };
  }
  if (obj.type === "counter") {
    const r = obj.size / 2;
    return {
      minX: obj.x - r,
      minY: obj.y - r,
      maxX: obj.x + r,
      maxY: obj.y + r,
    };
  }
  const tail = obj.type === "bubble" ? 14 : 0;
  return {
    minX: obj.x,
    minY: obj.y,
    maxX: obj.x + obj.width,
    maxY: obj.y + obj.height + tail,
  };
}

/** Convert two corner points to a normalized rectangle */
export function rectFromPoints(a: Point, b: Point): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const width = Math.abs(b.x - a.x);
  const height = Math.abs(b.y - a.y);
  return { x, y, width, height };
}
